import hashlib
import json
import os
import boto3
from datetime import datetime
from app.models.constitution import ScoredRoute
from app.core.logger import setup_logger

logger = setup_logger(__name__)

# MinIO Config
S3_ENDPOINT = os.getenv("S3_ENDPOINT", "http://localhost:9000")
S3_ACCESS_KEY = os.getenv("S3_ACCESS_KEY", "rutam_admin")
S3_SECRET_KEY = os.getenv("S3_SECRET_KEY", "rutam_password")
S3_BUCKET = "rutam-audit-logs"

def get_s3_client():
    return boto3.client(
        's3',
        endpoint_url=S3_ENDPOINT,
        aws_access_key_id=S3_ACCESS_KEY,
        aws_secret_access_key=S3_SECRET_KEY,
        region_name="us-east-1"
    )

class AuditService:
    @staticmethod
    def generate_audit_signature(route_id: str, scored_route: ScoredRoute) -> dict:
        """
        Security Mitigation 1: The 'Client-Side Lie' preventer.
        Recalculates the signature server-side and prepares an immutable S3 payload 
        for the route audit log.
        """
        # Serialize the scored route safely
        route_dump = scored_route.model_dump(mode='json')
        
        # Create a deterministic string representation
        payload_str = json.dumps(route_dump, sort_keys=True)
        
        # Generate SHA-256 signature
        signature = hashlib.sha256(payload_str.encode('utf-8')).hexdigest()
        
        # Prepare the immutable payload metadata
        timestamp = datetime.utcnow().isoformat() + "Z"
        s3_payload = {
            "route_id": route_id,
            "timestamp": timestamp,
            "composite_score": scored_route.composite_score,
            "signature": signature,
            "payload_data": route_dump,
            "storage_status": "PENDING_UPLOAD"
        }
        
        # Upload to S3
        object_key = f"audit/{route_id}_{timestamp}.json"
        try:
            s3 = get_s3_client()
            # Ensure bucket exists
            try:
                s3.head_bucket(Bucket=S3_BUCKET)
            except Exception:
                s3.create_bucket(Bucket=S3_BUCKET)
                
            s3.put_object(
                Bucket=S3_BUCKET,
                Key=object_key,
                Body=json.dumps(s3_payload).encode('utf-8'),
                ContentType='application/json'
            )
            s3_payload["storage_status"] = "UPLOADED"
            logger.info(f"Audit log {object_key} successfully uploaded to S3.")
        except Exception as e:
            logger.error(f"S3 upload failed for {object_key}: {e}. Caching locally.")
            s3_payload["storage_status"] = "LOCAL_CACHE"
            # Fallback local cache
            os.makedirs("audit_fallback", exist_ok=True)
            fallback_path = os.path.join("audit_fallback", f"{route_id}_{signature}.json")
            with open(fallback_path, "w", encoding="utf-8") as f:
                json.dump(s3_payload, f)
        
        return s3_payload
