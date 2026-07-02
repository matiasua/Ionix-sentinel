import re, glob, os

REPO = "../Ionix-sentinel-demo"  # worktree de la rama pci-vulnerable-demo

def luhn_valid(s):
    digits = [int(c) for c in s if c.isdigit()]
    if len(digits) < 13:
        return False
    total = 0
    parity = len(digits) % 2
    for i, d in enumerate(digits):
        if i % 2 == parity:
            d *= 2
            if d > 9:
                d -= 9
        total += d
    return total % 10 == 0

RULES = [
    ("PCI-SECRET-HARDCODED", r"\w*(password|secret|token|api[_-]?key)\w*\s*[:=]\s*[\"'][^\"']{6,}[\"']", False),
    ("PCI-PAN-CVV-LOGGED", r"console\.(log|error|warn)\([^;]*?(\b(pan|cvv)\b|JSON\.stringify\()", False),
    ("PCI-SQL-INJECTION", r"`[^`]*\b(SELECT|INSERT|UPDATE|DELETE)\b[^`]*\$\{[^`]*`", False),
    ("PCI-WEAK-CRYPTO", r"createCipheriv\(\s*[\"'][a-z0-9-]*ecb[\"']", False),
    ("PCI-INSECURE-STORAGE-CLIENT", r"localStorage\.setItem\([^)]*\b(pan|cvv|card)\b", False),
    ("PCI-NO-TLS", r"ssl\s*:\s*false", False),
    ("PCI-PAN-LITERAL", r"\b\d{13,19}\b", True),
]

files = [f for f in glob.glob(f"{REPO}/**/*.*", recursive=True)
         if f.endswith((".ts", ".tsx", ".sql")) and "/node_modules/" not in f]

for rule_id, pattern, needs_luhn in RULES:
    print(f"\n=== {rule_id} ===")
    rx = re.compile(pattern, re.IGNORECASE)
    for f in sorted(files):
        text = open(f).read()
        for m in rx.finditer(text):
            line_no = text[:m.start()].count("\n") + 1
            snippet = m.group(0)[:70].replace("\n", " ")
            if needs_luhn:
                digits = "".join(c for c in m.group(0) if c.isdigit())
                valid = luhn_valid(digits)
                print(f"  {os.path.relpath(f, REPO)}:{line_no} luhn_valid={valid} -> {snippet}")
            else:
                print(f"  {os.path.relpath(f, REPO)}:{line_no} -> {snippet}")
