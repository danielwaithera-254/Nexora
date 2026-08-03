# -*- coding: utf-8 -*-
"""
Nexora - MetaTrader 5 Bridge Server

Local HTTP server that connects to a running MetaTrader 5 terminal via the
official MetaTrader5 Python package and exposes closed-trade history to the
browser (Nexora MT5 Gateway).

Run:
    pip install -r requirements.txt
    python mt5_server.py

By default it listens on http://127.0.0.1:8000
"""

from __future__ import annotations

import time
import threading
from datetime import datetime, timedelta

from flask import Flask, jsonify, request

try:
    import MetaTrader5 as mt5
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "MetaTrader5 package is not installed. Run: pip install MetaTrader5"
    ) from exc

# Deal / entry type constants (MetaTrader5)
DEAL_BUY = 0
DEAL_SELL = 1
ENTRY_IN = 0   # opening a position
ENTRY_OUT = 1  # closing a position

app = Flask(__name__)

_state = {
    "connected": False,
    "account": None,
    "server": None,
    "last_sync": None,
}
_lock = threading.Lock()


def _cors(resp):
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return resp


def _ok(data=None, **extra):
    payload = {"success": True}
    if data is not None:
        payload.update(data)
    payload.update(extra)
    return _cors(jsonify(payload))


def _err(message, code=400):
    return _cors(jsonify({"success": False, "error": message})), code


@app.route("/api/health", methods=["GET", "OPTIONS"])
def health():
    if request.method == "OPTIONS":
        return _ok()
    return _ok(
        {
            "service": "nexora-mt5-bridge",
            "connected": _state["connected"],
            "account": _state["account"],
            "server": _state["server"],
            "last_sync": _state["last_sync"],
        }
    )


@app.route("/api/connect", methods=["POST", "OPTIONS"])
def connect():
    if request.method == "OPTIONS":
        return _ok()
    req = request.get_json(silent=True) or {}
    login = req.get("login")
    password = req.get("password", "")
    server = req.get("server", "")

    if login is None or password == "":
        return _err("Account ID and password are required.")

    with _lock:
        # initialize against the local terminal
        if not mt5.initialize():
            code, detail = mt5.last_error()
            return _err(f"MT5 initialization failed: {detail or code}. Is the MT5 terminal installed?")

        try:
            authorized = mt5.login(
                login=int(login), password=password, server=server or None
            )
        except Exception as exc:  # pragma: no cover
            mt5.shutdown()
            return _err(f"Login error: {exc}")

        if not authorized:
            err_code, err_detail = mt5.last_error()
            mt5.shutdown()
            return _err(f"Login failed: {err_detail or err_code}. Check credentials and broker server.")

        account_info = mt5.account_info()
        _state.update(
            connected=True,
            account=account_info.login if account_info else login,
            server=(account_info.server if account_info else server),
            last_sync=None,
        )
        return _ok(
            {
                "account": _state["account"],
                "server": _state["server"],
                "balance": round(account_info.balance, 2) if account_info else None,
                "equity": round(account_info.equity, 2) if account_info else None,
                "currency": account_info.currency if account_info else None,
            }
        )


@app.route("/api/trades", methods=["GET", "OPTIONS"])
def trades():
    if request.method == "OPTIONS":
        return _ok()
    if not _state["connected"]:
        return _err("Not connected. Call /api/connect first.", 409)

    days_back = request.args.get("days_back", default=365, type=int)
    to_date = datetime.now() + timedelta(days=1)
    from_date = to_date - timedelta(days=days_back)

    with _lock:
        deals = mt5.history_deals_get(from_date, to_date)
        if deals is None or len(deals) == 0:
            return _ok({"count": 0, "trades": []})
        deals_list = list(deals)

    # Pair opening and closing deals by position id so we can report
    # open price + close price for every closed position.
    by_position: dict[int, dict] = {}
    for d in deals_list:
        position = getattr(d, "position", None)
        if position is None:
            continue
        if position not in by_position:
            by_position[position] = {"open": None, "close": None}
        bucket = "open" if getattr(d, "entry", 0) == ENTRY_IN else "close"
        by_position[position][bucket] = d

    trades_out = []
    seen = set()
    for deal in deals_list:
        if getattr(deal, "entry", 0) != ENTRY_OUT:
            continue  # only closing deals carry realized P&L
        if deal.position in seen:
            continue  # one row per closed position
        seen.add(deal.position)

        entry_deal = by_position.get(deal.position, {}).get("open")
        close_time = datetime.utcfromtimestamp(deal.time)
        # Meta 5 deal type on closure is opposite to the position side
        position_side = "Long" if deal.type == DEAL_SELL else "Short"

        open_price = float(getattr(entry_deal, "price", 0.0)) if entry_deal else None
        open_time = (
            datetime.utcfromtimestamp(entry_deal.time).isoformat() if entry_deal else None
        )
        qty = float(getattr(deal, "volume", 0.0) or 0.0)
        pnl = float(getattr(deal, "profit", 0.0) or 0.0)
        commission = float(getattr(deal, "commission", 0.0) or 0.0)
        swap = float(getattr(deal, "swap", 0.0) or 0.0)
        comment = getattr(deal, "comment", "") or ""

        trades_out.append(
            {
                "Deal": int(deal.position),
                "Ticket": int(getattr(deal, "ticket", deal.position)),
                "Time": close_time.isoformat(),
                "OpenTime": open_time,
                "Type": position_side,
                "Side": position_side,
                "Volume": qty,
                "Symbol": getattr(deal, "symbol", ""),
                "Price": float(getattr(deal, "price", 0.0) or 0.0),
                "OpenPrice": open_price,
                "ClosePrice": float(getattr(deal, "price", 0.0) or 0.0),
                "Profit": pnl,
                "Commission": commission,
                "Swap": swap,
                "Comment": comment,
            }
        )

    _state["last_sync"] = datetime.now().isoformat()
    total = sum(t["Profit"] + t["Commission"] + t["Swap"] for t in trades_out)
    return _ok({"count": len(trades_out), "total_pnl": round(total, 2), "trades": trades_out})


@app.route("/api/disconnect", methods=["POST", "OPTIONS"])
def disconnect():
    if request.method == "OPTIONS":
        return _ok()
    with _lock:
        try:
            mt5.shutdown()
        except Exception:
            pass
        _state["connected"] = False
        _state["account"] = None
        _state["server"] = None
        _state["last_sync"] = None
    return _ok()


@app.after_request
def after_request(resp):
    return _cors(resp)


if __name__ == "__main__":
    PORT = 8765
    print("=" * 60)
    print("Nexora MetaTrader Bridge Server")
    print(f"Listening on http://127.0.0.1:{PORT}")
    print("MetaTrader terminal must be installed on this machine.")
    print("=" * 60)
    app.run(host="127.0.0.1", port=PORT, threaded=True, debug=False)