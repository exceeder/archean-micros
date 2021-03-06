---
to: backend-postgres/k8s/service.yaml
unless_exists: true
---
apiVersion: v1
kind: Service
metadata:
  name: backend-postgres
  labels:
    app: postgres
    role: master
    tier: backend
spec:
  ports:
    - port: 5432
      targetPort: 5432
  selector:
    app: postgres
    role: master
    tier: backend