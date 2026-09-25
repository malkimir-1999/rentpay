CREATE OR REPLACE FUNCTION prevent_audit_event_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Audit events are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AuditEvent_immutable"
BEFORE UPDATE OR DELETE ON "AuditEvent"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_event_mutation();
