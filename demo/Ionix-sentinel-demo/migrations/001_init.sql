-- VULN-002 [PCI-DSS 3.5.1] — el PAN se guarda en texto plano (VARCHAR sin
-- truncar/tokenizar/cifrar). El fixture original también persistía CVV y
-- track2 (banda magnética) en esta tabla — se corrigió: esos datos (SAD)
-- nunca deben almacenarse, por eso esas columnas ya no existen.
CREATE TABLE cardholders (
    id SERIAL PRIMARY KEY,
    customer_email VARCHAR(255) NOT NULL,
    pan VARCHAR(19) NOT NULL,          -- VULN-002: PAN en claro, sin truncar/tokenizar
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
