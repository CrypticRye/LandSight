import React, { useState } from "react";

const UploadPredict = () => {
  const [file, setFile] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFile(e.target.files[0]);
    setPrediction(null);
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://127.0.0.1:5000/api/predict", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setPrediction(data);
    } catch (err) {
      console.error(err);
      setPrediction({ error: "Prediction failed" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Land Classification (Dummy)</h2>
      <input type="file" onChange={handleChange} />
      <button onClick={handleUpload} disabled={!file || loading}>
        {loading ? "Predicting..." : "Upload & Predict"}
      </button>

      {prediction && (
        <div style={{ marginTop: "20px" }}>
          {prediction.error ? (
            <p style={{ color: "red" }}>{prediction.error}</p>
          ) : (
            <>
              <p>
                <strong>Class:</strong> {prediction.class}
              </p>
              <p>
                <strong>Confidence:</strong> {prediction.confidence}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default UploadPredict;