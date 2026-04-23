from datetime import datetime
from app import db


class ClassificationRecord(db.Model):
    __tablename__ = "classification_records"

    id           = db.Column(db.Integer, primary_key=True)
    filename     = db.Column(db.String(255))
    land_type    = db.Column(db.String(100), nullable=False)
    confidence   = db.Column(db.Float, nullable=False)
    is_satellite = db.Column(db.Boolean, default=True)
    image_base64 = db.Column(db.Text)
    features     = db.Column(db.JSON)
    all_probs    = db.Column(db.JSON)
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id":           self.id,
            "filename":     self.filename,
            "landType":     self.land_type,
            "confidence":   round(self.confidence * 100, 1),
            "isSatellite":  self.is_satellite,
            "features":     self.features or [],
            "allProbs":     self.all_probs or {},
            "image_base64": self.image_base64,
            "createdAt":    self.created_at.isoformat(),
        }


class ChangeDetectionRecord(db.Model):
    __tablename__ = "change_detection_records"

    id          = db.Column(db.Integer, primary_key=True)
    before_type = db.Column(db.String(100))
    after_type  = db.Column(db.String(100))
    before_conf = db.Column(db.Float)
    after_conf  = db.Column(db.Float)
    changes     = db.Column(db.JSON)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id":         self.id,
            "beforeType": self.before_type,
            "afterType":  self.after_type,
            "beforeConf": round((self.before_conf or 0) * 100, 1),
            "afterConf":  round((self.after_conf  or 0) * 100, 1),
            "changes":    self.changes or [],
            "createdAt":  self.created_at.isoformat(),
        }


class SentinelChangeRecord(db.Model):
    """Logs each Sentinel-2 scene-pair search via Copernicus CDSE."""
    __tablename__ = "sentinel_change_records"

    id           = db.Column(db.Integer, primary_key=True)
    lat          = db.Column(db.Float, nullable=False)
    lng          = db.Column(db.Float, nullable=False)
    before_start = db.Column(db.String(20))
    before_end   = db.Column(db.String(20))
    after_start  = db.Column(db.String(20))
    after_end    = db.Column(db.String(20))
    # Best scene found for each period:
    before_date  = db.Column(db.String(20))
    after_date   = db.Column(db.String(20))
    before_cloud = db.Column(db.Float)
    after_cloud  = db.Column(db.Float)
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id":          self.id,
            "lat":         self.lat,
            "lng":         self.lng,
            "beforeStart": self.before_start,
            "beforeEnd":   self.before_end,
            "afterStart":  self.after_start,
            "afterEnd":    self.after_end,
            "beforeDate":  self.before_date,
            "afterDate":   self.after_date,
            "beforeCloud": self.before_cloud,
            "afterCloud":  self.after_cloud,
            "createdAt":   self.created_at.isoformat(),
        }
