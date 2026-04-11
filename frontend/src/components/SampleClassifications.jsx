import "./SampleClassifications.css";

const SAMPLES = [
  {
    id: 1,
    label: "Urban",
    type: "Sample Image",
    url: "./assets/Residential.jpg",
  },
  {
    id: 2,
    label: "Vegetation",
    type: "Sample Image",
    url: "./assets/Forest.jpg",
  },
  {
    id: 3,
    label: "Water",
    type: "Sample Image",
    url: "./assets/River.jpg",
  },
  {
    id: 4,
    label: "Agriculture",
    type: "Sample Image",
    url: "./assets/AnnualCrop.jpg",
  },
  {
    id: 5,
    label: "Bare Land",
    type: "Sample Image",
    url: "./assets/Pasture.jpg",
  },
];

export default function SampleClassifications({ onSelectSample }) {
  return (
    <section className="samples-section">
      <div className="samples-header">
        <h2 className="samples-title">Sample Classifications</h2>
        <p className="samples-subtitle">Click on any sample image to view or use it for testing the classifier</p>
      </div>
      <div className="samples-grid">
        {SAMPLES.map((sample) => (
          <div key={sample.id} className="sample-card" onClick={() => onSelectSample && onSelectSample(sample)}>
            <img src={sample.url} alt={sample.label} className="sample-img" />
            <div className="sample-overlay">
              <span className="sample-label">{sample.label}</span>
              <span className="sample-type">{sample.type}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
