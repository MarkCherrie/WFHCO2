import { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Lenis from 'lenis';
import Papa from 'papaparse';
import * as d3 from 'd3';

gsap.registerPlugin(ScrollTrigger);

export default function DataStory() {
  const main = useRef();
  const svgRef = useRef();
  const barChartRef = useRef();
  const populationRef = useRef();
  const [data, setData] = useState([]);
  const [barData, setBarData] = useState([]);

  // --- 1. DATA LOADING (src/assets/table1.csv) ---
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('table1.csv');
        const csvString = await response.text();

        Papa.parse(csvString, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const raw = results.data;
            const keys = Object.keys(raw[0]);
            const groupedMap = new Map();

            raw.forEach(row => {
              const label = row[keys[1]]?.trim();
              const year = parseInt(row[keys[2]]);
              const val = parseFloat(row[keys[3]]);

              if (!label || isNaN(val)) return;

              if (!groupedMap.has(label)) {
                groupedMap.set(label, { label, y2011: 0, y2022: 0 });
              }
              
              const entry = groupedMap.get(label);
              if (year === 2011) entry.y2011 = val;
              if (year === 2022) entry.y2022 = val;
            });

            const finalData = Array.from(groupedMap.values()).map((d, i) => ({
              ...d,
              color: d.label.includes("Driving") ? "#3b82f6" : "#ef4444"
            }));

            /// filter to just 'Driving a car or van' and 'Working from home'
            const filteredData = finalData.filter(d => d.label === "Driving a car or van" || d.label === "Work from home");

            setData(filteredData);
          }
        });
      } catch (err) {
        console.error("CSV Load Error:", err);
      }
    };
    loadData();
  }, []);

  // --- 1B. CO2 DATA LOADING (src/assets/table2.csv) ---
  useEffect(() => {
    const loadCO2Data = async () => {
      try {
        const response = await fetch('table2.csv');
        const csvString = await response.text();

        Papa.parse(csvString, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const raw = results.data;
            const scenarioMap = new Map();

            raw.forEach(row => {
              const scenario = row['Scenario']?.trim();
              const emissions = parseFloat(row[' CO2 emissions (kg CO₂e)']);
              const category = row[' Category']?.trim();

              if (!scenario || isNaN(emissions) || !category) return;

              if (!scenarioMap.has(scenario)) {
                scenarioMap.set(scenario, { scenario, categories: {} });
              }
              
              const entry = scenarioMap.get(scenario);
              entry.categories[category] = emissions;
            });

            const stackedData = Array.from(scenarioMap.values());
            setBarData(stackedData);
          }
        });
      } catch (err) {
        console.error("CO2 CSV Load Error:", err);
      }
    };
    loadCO2Data();
  }, []);

  // --- 2. SMOOTH SCROLL (LENIS) ---
  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
    });

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
      gsap.ticker.remove(lenis.raf);
    };
  }, []);

  // --- 3. CHART DIMENSIONS ---
  const width = 1400; 
  const height = 600;
  const margin = { top: 80, right: 380, bottom: 80, left: 100 };
  const chartHeight = height - margin.top - margin.bottom;
  
  // Dynamic Y Scale based on CSV values
  const maxVal = data.length ? d3.max(data, d => Math.max(d.y2011, d.y2022)) : 60;
  const getY = (val) => chartHeight - (val / (maxVal + 5)) * chartHeight + margin.top;
  
  const x1 = margin.left;
  const x2 = width - margin.right;

// --- 4. ANIMATION LOGIC (TIMELINE) ---
useGSAP(() => {
    if (data.length === 0) return;

    // Create a master timeline
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".chart-container",
        start: "top top",    // Starts exactly when the section fills the screen
        end: "+=1500",       // Duration of the "locked" scroll
        scrub: 1,
        pin: true,           // Locks the chart in place
        anticipatePin: 1,    // Smoother transition into the pin
      }
    });

    data.forEach((item, i) => {
      const line = svgRef.current.querySelector(`.line-${i}`);
      const box = svgRef.current.querySelector(`.box-${i}`);
      const length = line.getTotalLength();

      // Setup initial hidden states
      gsap.set(line, { 
        strokeDasharray: length, 
        strokeDashoffset: length, 
        visibility: "visible" 
      });
      gsap.set(box, { opacity: 0, x: 20 });

      // sequence: Line 1 -> Box 1 -> Line 2 -> Box 2
      tl.to(line, { 
        strokeDashoffset: 0, 
        duration: 2, 
        ease: "power2.inOut" 
      })
      .to(box, { 
        opacity: 1, 
        x: 0, 
        duration: 1, 
        ease: "back.out(1.7)" 
      }, "-=0.5"); // Box starts appearing slightly before line finishes
    });

    ScrollTrigger.refresh();
  }, { scope: main, dependencies: [data] });

  // --- 5. STACKED BAR CHART ANIMATION ---
  useGSAP(() => {
    if (barData.length === 0) return;

    const tl2 = gsap.timeline({
      scrollTrigger: {
        trigger: ".bar-chart-container",
        start: "top top",
        end: "+=1500",
        scrub: 1,
        pin: true,
        anticipatePin: 1,
      }
    });

    barData.forEach((item, i) => {
      const workplaceRect = barChartRef.current?.querySelector(`.stack-workplace-${i}`);
      const commuteRect = barChartRef.current?.querySelector(`.stack-commute-${i}`);
      const labelRect = barChartRef.current?.querySelector(`.bar-label-${i}`);
      const labelTexts = barChartRef.current?.querySelectorAll(`.bar-label-text-${i}`);
      const labelLine = barChartRef.current?.querySelector(`.bar-label-line-${i}`);
      const scenarioLabel = barChartRef.current?.querySelector(`.bar-scenario-label-${i}`);

      if (workplaceRect) {
        const targetHeight = workplaceRect.getAttribute('data-height');
        const targetY = workplaceRect.getAttribute('data-y');
        const barY = 520;
        
        // Animate workplace growing from bottom
        tl2.to(workplaceRect, { 
          attr: { 
            height: targetHeight,
            y: targetY
          },
          duration: 1.2,
          ease: "power2.inOut"
        }, i * 0.4);
      }

      if (commuteRect) {
        const targetHeight = commuteRect.getAttribute('data-height');
        const targetY = commuteRect.getAttribute('data-y');
        
        // Animate commute growing from bottom
        tl2.to(commuteRect, { 
          attr: { 
            height: targetHeight,
            y: targetY
          },
          duration: 1.2,
          ease: "power2.inOut"
        }, i * 0.4 + 0.8);
      }

      if (labelRect) {
        tl2.to(labelRect, { opacity: 1, duration: 0.6 }, 2.8 + i * 0.3);
      }

      if (labelTexts) {
        labelTexts.forEach(text => {
          tl2.to(text, { opacity: 1, duration: 0.6 }, 2.8 + i * 0.3);
        });
      }

      if (labelLine) {
        tl2.to(labelLine, { opacity: 1, duration: 0.6 }, 2.8 + i * 0.3);
      }

      if (scenarioLabel) {
        tl2.to(scenarioLabel, { opacity: 1, duration: 0.6 }, i * 0.4 + 1.2);
      }
    });

    ScrollTrigger.refresh();
  }, { scope: main, dependencies: [barData] });

  // --- 7. POPULATION IMPACT ANIMATION ---
  useGSAP(() => {
    if (!populationRef.current) return;
    const rows = populationRef.current.querySelectorAll('.calc-row');
    if (!rows.length) return;

    const tl3 = gsap.timeline({
      scrollTrigger: {
        trigger: ".population-container",
        start: "top top",
        end: "+=2500",
        scrub: 1,
        pin: true,
        anticipatePin: 1,
      }
    });

    rows.forEach((row, i) => {
      tl3.fromTo(row,
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 1.5 },
        i * 1.2
      );
    });

    ScrollTrigger.refresh();
  }, { scope: main, dependencies: [data] });

  if (data.length === 0) return <div style={styles.loading}>Loading Data...</div>;

  return (
    <div ref={main} style={{ background: '#0e100f', width: '100%' }}>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { 
          height: auto !important; 
          overflow-y: auto !important; 
          background: #0e100f; 
        }
        .data-line { visibility: hidden; }
        svg { overflow: visible !important; }
      `}</style>

      {/* Hero Section */}
      <section style={styles.section}>
        <h1 style={styles.title}>WFH + CO2</h1>
        <p style={{ opacity: 0.5, fontSize: '1.5rem' }}>Scroll to reveal</p>
      </section>

      {/* Chart Section */}
      <section className="chart-container" style={{ ...styles.section, background: '#111' }}>
        <div className="content" style={{ ...styles.card, display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
          {/* Left side - Chart */}
          <div style={{ flex: 3, minWidth: '0' }}>
            <h2 style={{ color: 'white', marginBottom: '40px', fontSize: '2.5rem' }}>Working Trends</h2>
          
            <svg 
              ref={svgRef} 
              viewBox={`0 0 ${width} ${height}`} 
              style={{ width: '100%', height: 'auto', display: 'block' }}
            >
              {/* Axis Lines */}
              <line x1={x1} y1={margin.top} x2={x1} y2={height - margin.bottom} stroke="#444" strokeWidth="2" />
              <line x1={x2} y1={margin.top} x2={x2} y2={height - margin.bottom} stroke="#444" strokeWidth="2" />
              
              <text x={x1} y={margin.top - 25} textAnchor="middle" fill="#888" fontSize="26" fontWeight="bold">2011</text>
              <text x={x2} y={margin.top - 25} textAnchor="middle" fill="#888" fontSize="26" fontWeight="bold">2022</text>

             {data.map((item, i) => {
  const y2022 = getY(item.y2022);
  const boxX = x2 + 40;
  const boxWidth = 280; // Adjust based on label length

  return (
    <g key={i}>
      {/* The Connecting Line */}
      <path
        className={`data-line line-${i}`}
        d={`M ${x1} ${getY(item.y2011)} L ${x2} ${y2022}`}
        fill="none"
        stroke={item.color}
        strokeWidth="6"
        strokeLinecap="round"
      />
      
      {/* The Label Group (The "Box") */}
      <g className={`box-${i}`}>
        {/* White Background Box */}
        <rect 
          x={boxX} 
          y={y2022 - 25} 
          width={boxWidth} 
          height="50" 
          rx="8" 
          fill="white" 
        />
        {/* Black Text */}
        <text 
          x={boxX + 15} 
          y={y2022} 
          alignmentBaseline="middle" 
          fill="black" 
          style={{ fontWeight: 'bold', fontSize: '18px' }}
        >
          {item.y2022}% {item.label}
        </text>
        
        {/* Tiny connector line from axis to box */}
        <line x1={x2} y1={y2022} x2={boxX} y2={y2022} stroke="white" strokeWidth="1" opacity="0.5" />
      </g>

      {/* Static Left Label */}
      <text x={x1 - 25} y={getY(item.y2011)} textAnchor="end" alignmentBaseline="middle" fill="white" fontSize="22">{item.y2011}%</text>
    </g>
  );
})}
            </svg>
          </div>

          {/* Right side - Text explanation */}
          <div style={{ flex: 1, paddingTop: '40px' }}>
            <h2 style={{ color: 'white', marginBottom: '30px', fontSize: '2rem' }}>Less people driving, and more people working from home</h2>
            <div style={{ color: '#ccc', fontSize: '1.1rem', lineHeight: '1.8', space: '20px' }}>
              <p style={{ marginBottom: '20px' }}>
                Between 2011 and 2022, significant changes in commuting patterns emerged in Scotland.
              </p>
              <p style={{ marginBottom: '20px' }}>
                <strong style={{ color: '#3b82f6' }}>Car or van driving</strong> remained the dominant mode of transport to work, while <strong style={{ color: '#ef4444' }}>working from home</strong> roughly trebled.
              </p>
              <p style={{ marginBottom: '20px' }}>
                This shift reflects broader changes after in the workforce and workplace dynamics that began during the COVID-19 pandemic.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stacked Bar Chart Section */}
      <section className="bar-chart-container" style={{ ...styles.section, background: '#111', minHeight: '120vh' }}>
        <div className="content" style={{ ...styles.card, display: 'flex', gap: '40px', alignItems: 'flex-start', paddingTop: '100px', paddingBottom: '300px' }}>
          {/* Left side - Chart */}
          <div style={{ flex: 3, minWidth: '0' }}>
            <svg 
              ref={barChartRef} 
              viewBox={`0 0 ${width - 15} 750`} 
              style={{ width: '100%', height: 'auto', display: 'block' }}
            >
              {/* Y Axis */}
              <line x1={100} y1={80} x2={100} y2={650} stroke="#444" strokeWidth="2" />
              <line x1={95} y1={650} x2={1350} y2={650} stroke="#444" strokeWidth="2" />
              
              {/* Y Axis Label */}
              <text x="30" y="365" textAnchor="middle" fill="white" fontSize="26" transform="rotate(-90 30 365)">kg CO₂e</text>
              
              {/* Grid lines and labels */}
              {[0, 1, 2, 3, 4, 5, 6].map((val) => {
                const y = 650 - (val / 5) * 475;
                return (
                  <g key={val}>
                    <line x1={95} y1={y} x2={100} y2={y} stroke="#444" strokeWidth="1" />
                    <text x={85} y={y + 5} textAnchor="end" fill="white" fontSize="24">{val}</text>
                  </g>
                );
              })}

              {barData.map((item, i) => {
                const barWidth = 150;
                const groupSpacing = 380;
                const startX = 90 + (groupSpacing / 2) + i * groupSpacing;
                const barY = 650;
                
                const workplaceEmissions = item.categories['Workplace'] || 0;
                const commuteEmissions = item.categories['Commute'] || 0;
                const totalEmissions = workplaceEmissions + commuteEmissions;
                
                const scale = (val) => (val / 5) * 475;
                const workplaceHeight = scale(workplaceEmissions);
                const commuteHeight = scale(commuteEmissions);
                
                // Find min and max totals
                const allTotals = barData.map(d => (d.categories['Workplace'] || 0) + (d.categories['Commute'] || 0));
                const minTotal = Math.min(...allTotals);
                const maxTotal = Math.max(...allTotals);
                const isMin = totalEmissions === minTotal;
                const isMax = totalEmissions === maxTotal;

                return (
                  <g key={i}>
                    {/* Workplace (bottom) */}
                    <rect
                      className={`stack-workplace-${i}`}
                      x={startX}
                      y={barY}
                      width={barWidth}
                      height="0"
                      fill="#8b5cf6"
                      rx="2"
                      data-height={workplaceHeight}
                      data-y={barY - workplaceHeight}
                    />

                    {/* Commute (top) */}
                    <rect
                      className={`stack-commute-${i}`}
                      x={startX}
                      y={barY - workplaceHeight}
                      width={barWidth}
                      height="0"
                      fill="#f59e0b"
                      rx="2"
                      data-height={commuteHeight}
                      data-y={barY - workplaceHeight - commuteHeight}
                    />

                    {/* Label for min and max */}
                    {(isMin || isMax) && (
                      <g>
                        {/* Connector line from bar to label */}
                        <line 
                          className={`bar-label-line-${i}`}
                          x1={startX + barWidth / 2}
                          y1={barY - workplaceHeight - commuteHeight}
                          x2={startX + barWidth / 2}
                          y2={barY - workplaceHeight - commuteHeight - 50}
                          stroke="white"
                          strokeWidth="1"
                          opacity="0"
                        />

                        {/* White Background Box */}
                        <rect 
                          className={`bar-label-${i}`}
                          x={startX + barWidth / 2 - 60} 
                          y={barY - workplaceHeight - commuteHeight - 100} 
                          width="120" 
                          height="50" 
                          rx="8" 
                          fill="white"
                          opacity="0"
                        />
                        {/* Black Text */}
                        {/* <text 
                          className={`bar-label-text-${i}`}
                          x={startX + barWidth / 2} 
                          y={barY - workplaceHeight - commuteHeight - 40} 
                          textAnchor="middle" 
                          fill="black" 
                          style={{ fontWeight: 'bold', fontSize: '16px' }}
                          opacity="0"
                        >
                          {isMin ? 'Lowest' : 'Highest'}
                        </text> */}
                        <text 
                          className={`bar-label-text-${i}`}
                          x={startX + barWidth / 2} 
                          y={barY - workplaceHeight - commuteHeight - 67} 
                          textAnchor="middle" 
                          fill="black" 
                          style={{ fontWeight: 'bold', fontSize: '24px' }}
                          opacity="0"
                        >
                          {totalEmissions.toFixed(2)} kg
                        </text>
                      </g>
                    )}

                    {/* Value labels */}
                    <text 
                      x={startX + barWidth / 2} 
                      y={barY - workplaceHeight + 15} 
                      textAnchor="middle" 
                      fill="white" 
                      fontSize="0" 
                      fontWeight="bold"
                    >
                      {workplaceEmissions}
                    </text>
                    
                    {commuteEmissions > 0 && (
                      <text 
                        x={startX + barWidth / 2} 
                        y={barY - workplaceHeight - commuteHeight / 2} 
                        textAnchor="middle" 
                        fill="white" 
                        fontSize="0" 
                        fontWeight="bold"
                      >
                        {commuteEmissions}
                      </text>
                    )}

                    {/* Scenario Label */}
                    <text 
                      className={`bar-scenario-label-${i}`}
                      x={startX + barWidth / 2} 
                      y={barY + 50} 
                      textAnchor="middle" 
                      fill="white" 
                      fontSize="24"
                      opacity="0"
                    >
                      {(() => {
                        const words = item.scenario.split(' ');
                        const lines = [];
                        for (let j = 0; j < words.length; j += 3) {
                          lines.push(words.slice(j, j + 3).join(' '));
                        }
                        return (
                          <>
                            {lines.map((line, idx) => (
                              <tspan key={idx} x={startX + barWidth / 2} dy={idx === 0 ? "0" : "28"}>{line}</tspan>
                            ))}
                          </>
                        );
                      })()}
                    </text>
                  </g>
                );
              })}

              {/* Legend */}
              {/* <g>
                <rect x={width - 300} y={100} width="20" height="20" fill="#8b5cf6" rx="2" />
                <text x={width - 270} y={115} fill="white" fontSize="20">Workplace</text>

                <rect x={width - 300} y={150} width="20" height="20" fill="#f59e0b" rx="2" />
                <text x={width - 270} y={165} fill="white" fontSize="20">Commute</text>
              </g> */}
            </svg>
          </div>

          {/* Right side - Text explanation */}
          <div style={{ flex: 1, paddingTop: '40px' }}>
            <h2 style={{ color: 'white', marginBottom: '30px', fontSize: '2rem' }}>CO₂ Emissions Breakdown</h2>
            <div style={{ color: '#ccc', fontSize: '1.1rem', lineHeight: '1.8', space: '20px' }}>
              <p style={{ marginBottom: '20px' }}>
                This visualisation compares the carbon footprint of two work scenarios over an 8-hour workday.
              </p>
              <p style={{ marginBottom: '20px' }}>
                <strong style={{ color: '#8b5cf6' }}>Workplace</strong> emissions represent energy consumption at the workplace, while <strong style={{ color: '#f59e0b' }}>Commute</strong> emissions come from transportation.
              </p>
              <p style={{ marginBottom: '20px' }}>
                Working from home generates roughly half as much CO₂ overall, with no commute emissions and lower workplace energy use.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Population Impact Section */}
      <section className="population-container" style={{ ...styles.section, background: '#111', minHeight: '120vh' }}>
        <div ref={populationRef} className="content" style={{ ...styles.card, paddingTop: '80px', paddingBottom: '300px' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>

            <h1 className="calc-row" style={{ color: 'white', marginBottom: '60px', fontSize: '2.5rem', opacity: 0 }}>
              The bigger picture
            </h1>

            <div className="calc-row" style={{ opacity: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px', border: '1px solid #333', borderRadius: '12px', padding: '20px 28px', backgroundColor: '#1c1c1c' }}>
              <span style={{ color: '#aaa', fontSize: '1.3rem' }}>Scotland's working population</span>
              <span style={{ color: 'white', fontSize: '2.5rem', fontWeight: 'bold', fontFamily: 'monospace' }}>2,700,000</span>
            </div>

            <div className="calc-row" style={{ opacity: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '24px', border: '1px solid #333', borderRadius: '12px', padding: '20px 28px', backgroundColor: '#1c1c1c' }}>
              <span style={{ color: '#aaa', fontSize: '1.3rem' }}>× shift to WFH between 2011 and 2022</span>
              <span style={{ color: '#ef4444', fontSize: '2.5rem', fontWeight: 'bold', fontFamily: 'monospace' }}>20.8%</span>
            </div>

            <div className="calc-row" style={{ opacity: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px', border: '1px solid #333', borderRadius: '12px', padding: '20px 28px', backgroundColor: '#1c1c1c' }}>
              <span style={{ color: '#aaa', fontSize: '1.3rem' }}>= additional people working from home</span>
              <span style={{ color: 'white', fontSize: '2.5rem', fontWeight: 'bold', fontFamily: 'monospace' }}>≈ 561,600</span>
            </div>

            <div className="calc-row" style={{ opacity: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px', border: '1px solid #333', borderRadius: '12px', padding: '20px 28px', backgroundColor: '#1c1c1c' }}>
              <span style={{ color: '#aaa', fontSize: '1.3rem' }}>× daily CO₂ saved per person (vs driving to office)</span>
              <span style={{ color: '#f59e0b', fontSize: '2.5rem', fontWeight: 'bold', fontFamily: 'monospace' }}>1.70 kg</span>
            </div>

            <div className="calc-row" style={{ opacity: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px', border: '1px solid #333', borderRadius: '12px', padding: '20px 28px', backgroundColor: '#1c1c1c' }}>
              <span style={{ color: '#aaa', fontSize: '1.3rem' }}>× working days per year</span>
              <span style={{ color: 'white', fontSize: '2.5rem', fontWeight: 'bold', fontFamily: 'monospace' }}>235</span>
            </div>

            <div className="calc-row" style={{ opacity: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px', border: '1px solid #333', borderRadius: '12px', padding: '20px 28px', backgroundColor: '#1c1c1c' }}>
              <span style={{ color: 'white', fontSize: '1.8rem', fontWeight: 'bold' }}>= annual CO₂ saving</span>
              <span style={{ color: '#22d3ee', fontSize: '3.5rem', fontWeight: '900', fontFamily: 'monospace' }}>~224,000 tonnes</span>
            </div>

            <div className="calc-row" style={{ opacity: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', border: '1px solid #333', borderRadius: '12px', padding: '20px 28px', backgroundColor: '#1c1c1c' }}>
              <span style={{ color: '#555', fontSize: '1rem', fontStyle: 'italic' }}>
                ≈ equivalent to removing ~124,000 cars from Scottish roads for a year
              </span>
            </div>

          </div>
        </div>
      </section>

      {/* Spacing Section for Scroll Room */}
      <section style={{ ...styles.section, height: '100vh' }}>
         <h2 style={styles.title}>The End</h2>
            
      </section>
    </div>
  );
}

const styles = {
  section: {
    minHeight: '100vh',
    width: '100vw',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    fontFamily: 'sans-serif',
    color: 'white',
    padding: '20px'
  },
  loading: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', background: '#0e100f', fontSize: '2rem' },
  title: { fontSize: 'clamp(3rem, 10vw, 8rem)', fontWeight: '900', margin: 0, textTransform: 'uppercase' },
  card: {
    padding: '80px',
    backgroundColor: '#111',
    width: '96vw', 
    maxWidth: '1800px',
  }
};