-- VULN-002 [PCI-DSS 3.5.1] (CORREGIDO en demo-0) — el PAN ya no se almacena en
-- claro. Se guarda un token opaco emitido por el proveedor de pagos y solo los
-- últimos 4 dígitos para visualización. Ninguna columna contiene el PAN completo.
CREATE TABLE cardholders (
    id SERIAL PRIMARY KEY,
    customer_email VARCHAR(255) NOT NULL,
    pan_token VARCHAR(64) NOT NULL,    -- token de red/proveedor, no el PAN
    pan_last4 VARCHAR(4) NOT NULL,     -- solo últimos 4 para mostrar
    expiry_date VARCHAR(5) NOT NULL,
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    cardholder_id INTEGER REFERENCES cardholders(id),
    amount NUMERIC(12,2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    raw_gateway_response JSONB,
    created_at TIMESTAMP DEFAULT now()
);
