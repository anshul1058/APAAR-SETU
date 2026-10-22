"""QR code generation for signed verification records (backend_guide.md §8)."""
import base64
import io
import json

import qrcode


def record_qr(payload: dict, signature: str) -> str:
    """Encode {payload, sig} as a PNG data URL."""
    data = json.dumps({"payload": payload, "sig": signature}, separators=(",", ":"))
    img = qrcode.make(data, box_size=6, border=2)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
