import React from 'react';

const Chip = ({ amount }) => {
  let color = '#ecf0f1'; // White ($1)
  let border = '#bdc3c7';
  
  if (amount >= 500) { color = '#34495e'; border = '#2c3e50'; } // Black ($500)
  else if (amount >= 100) { color = '#e74c3c'; border = '#c0392b'; } // Red ($100)
  else if (amount >= 50) { color = '#2ecc71'; border = '#27ae60'; } // Green ($25)
  else if (amount >= 10) { color = '#3498db'; border = '#2980b9'; } // Blue ($10)

  return (
    <div className="poker-chip-3d" style={{ '--chip-color': color, '--chip-border': border }}>
      <div className="chip-inner"><span>${amount}</span></div>
    </div>
  );
};

export default Chip;