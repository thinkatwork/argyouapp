import React from 'react';
import styles from '../styles/Components.module.css';

const DegreeSlider = ({ value, onChange }) => {
  const getIntensityLabel = (value) => {
    if (value <= 3) return "Gentle Disagreement";
    if (value <= 6) return "Moderate Opposition";
    if (value <= 8) return "Strong Opposition";
    return "Maximum Intensity";
  };

  const getIntensityColor = (value) => {
    if (value <= 3) return "#4CAF50";  // Green
    if (value <= 6) return "#2196F3";  // Blue
    if (value <= 8) return "#FF9800";  // Orange
    return "#f44336";  // Red
  };

  return (
    <div className={styles.sliderContainer}>
      <div className={styles.sliderHeader}>
        <span>Argument Intensity: {value}</span>
        <span style={{ color: getIntensityColor(value) }}>
          {getIntensityLabel(value)}
        </span>
      </div>
      <input
        type="range"
        min="1"
        max="10"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={styles.slider}
        style={{ '--slider-color': getIntensityColor(value) }}
      />
    </div>
  );
};

export default DegreeSlider;
