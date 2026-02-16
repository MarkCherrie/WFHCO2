import React, { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Papa from 'papaparse';

gsap.registerPlugin(ScrollTrigger);

export default function CO2BarChart() {
  const containerRef = useRef();
  const [barData, setBarData] = useState([]);

  // 1. Load the CO2 Data
  useEffect(() => {
    const loadBarData = async () => {
      try {
        const response = await fetch('src/assets/table2.csv');
        const csvString = await response.text();
        Papa.parse(csvString, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => setBarData(results.data),
        });
      } catch (err) {
        // Fallback boilerplate if file isn't ready
        setBarData([
          { Scenario: "Working from home (8hr)", "CO2 emissions (kg CO₂e)": 1.2 },
          { Scenario: "Driving a car (Small Petrol)", "CO2 emissions (kg CO₂e)": 4.5 },
          { Scenario: "Commuting via Bus", "CO2 emissions (kg CO₂e)": 2.1 }
        ]);
      }
    };
    loadBarData();
  }, []);

  // 2. Animation Logic
  useGSAP(() => {
    if (barData.length === 0) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 20%", 
        end: "bottom 80%",
        toggleActions: "play none none reverse",
      }
    });

    // Animate Labels
    tl.from(".bar-label", {
      x: -50,
      opacity: 0,
      stagger: 0.2,
      duration: 0.8,
      ease: "power2.out"
    });

    // Animate Bars growing from width 0
    tl.from(".bar-rect", {
      scaleX: 0,
      transformOrigin: "left center",
      stagger: 0.2,
      duration: 1.2,
      ease: "expo.out"
    }, "-=0.8");

    // Animate Numbers
    tl.from(".bar-value", {
      opacity: 0,
      stagger: 0.2,
      duration: 0.5
    }, "-=1");

  }, { scope: containerRef, dependencies: [barData] });

  const chartWidth = 600;
  const barHeight = 40;
  const gap = 30;

  return (
    <section ref={containerRef} style={styles.barSection}>
      <div style={styles.gridContainer}>
        
        {/* Left Side: Context/Labels */}
        <div style={styles.leftCol}>
          <h2 style={styles.subTitle}>Carbon Footprint</h2>
          <p style={styles.description}>
            Comparing the daily environmental impact of different work scenarios.
          </p>
          <div style={styles.labelList}>
            {barData.map((d, i) => (
              <div key={i} className="bar-label" style={styles.sideLabel}>
                {d.Scenario}
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: The Chart */}
        <div style={styles.rightCol}>
          <svg viewBox={`0 0 ${chartWidth} ${barData.length * (barHeight + gap) + 50}`} style={{ width: '100%' }}>
            {barData.map((d, i) => {
              const val = d["CO2 emissions (kg CO₂e)"];
              // Map value to a max width of 400px
              const rectWidth = (val / 25) * 400; 
              const yPos = i * (barHeight + gap);

              return (
                <g key={i}>
                  <rect
                    className="bar-rect"
                    x="0"
                    y={yPos}
                    width={rectWidth}
                    height={barHeight}
                    rx="4"
                    fill={i === 0 ? "#10b981" : "#ef4444"} // Green for WFH, Red for others
                  />
                  <text
                    className="bar-value"
                    x={rectWidth + 15}
                    y={yPos + barHeight / 2}
                    alignmentBaseline="middle"
                    fill="white"
                    fontSize="16"
                    fontWeight="bold"
                  >
                    {val} kg CO₂e
                  </text>
                </g>
              );
            })}
            {/* X-Axis Baseline */}
            <line x1="0" y1="0" x2="0" y2={barData.length * (barHeight + gap)} stroke="#444" strokeWidth="2" />
          </svg>
        </div>
      </div>
    </section>
  );
}

const styles = {
  barSection: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    background: '#0e100f',
    padding: '0 10%',
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '80px',
    width: '100%',
    alignItems: 'center'
  },
  leftCol: { color: 'white' },
  subTitle: { fontSize: '3rem', marginBottom: '20px' },
  description: { fontSize: '1.2rem', opacity: 0.7, marginBottom: '40px' },
  labelList: { display: 'flex', flexDirection: 'column', gap: '30px' },
  sideLabel: { fontSize: '1.2rem', height: '40px', display: 'flex', alignItems: 'center', fontWeight: '500' },
  rightCol: { position: 'relative' }
};