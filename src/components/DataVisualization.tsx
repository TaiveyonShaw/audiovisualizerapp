'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface DataPoint {
  azimuth: number;
  value: number;
}

interface FilterOptions {
  aid: string;
  room: string;
  condition: string;
  run: string;
  metric: 'normILD' | 'rawILD' | 'normITD' | 'rawITD';
  freq: number;
}

const FREQUENCIES = [
  250.0,
  304.49995123,
  365.20163706,
  432.81077394,
  508.11338419,
  591.98493428,
  685.40051298,
  789.44616774,
  905.33153102,
  1034.40388347,
  1178.16381739,
  1338.28268258,
  1516.6220174,
  1715.25519099,
  1936.4915082,
  2182.90305753,
  2457.35461418,
  2763.03694583,
  3103.50390847,
  3482.71376342,
  3905.07519604,
  4375.49857092,
  4899.45301976,
  5483.03002533,
  6133.0142409,
  6856.9623685,
  7663.29101295,
  8561.37453312
];

export default function DataVisualization() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [displayType, setDisplayType] = useState<'line' | 'heatmap'>('line');
  const [filters, setFilters] = useState<FilterOptions>({
    aid: 'Occ',
    room: 'Ane',
    condition: 'spond',
    run: 'mean',
    metric: 'normILD',
    freq: 0
  });

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case 'normILD': return 'Normalized ILD (dB)';
      case 'rawILD': return 'Raw ILD (dB)';
      case 'normITD': return 'Normalized ITD (μs)';
      case 'rawITD': return 'Raw ITD (μs)';
      default: return '';
    }
  };

  const getMetricIndex = (metric: string) => {
    switch (metric) {
      case 'normILD': return 8;
      case 'rawILD': return 7;
      case 'normITD': return 10;
      case 'rawITD': return 9;
      default: return 8;
    }
  };

  const parseArrayString = (str: string): number[][] => {
    try {
      const cleaned = str.replace(/[\[\]]/g, '').trim();
      const rows = cleaned.split(/\s+/);
      
      const result: number[][] = [];
      let currentArray: number[] = [];
      
      rows.forEach(val => {
        if (!isNaN(Number(val))) {
          currentArray.push(Number(val));
          if (currentArray.length === (result.length === 0 ? 11 : 28)) {
            result.push(currentArray);
            currentArray = [];
          }
        }
      });
      
      return result;
    } catch (error) {
      console.error('Error parsing array string:', error);
      return [];
    }
  };

  useEffect(() => {
    if (!svgRef.current) return;

    // Clear any existing SVG content
    d3.select(svgRef.current).selectAll('*').remove();

    const width = 800;
    const height = displayType === 'heatmap' ? 600 : 400;

    // Create SVG and add labels
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Add axis labels
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height - 10)
      .attr('text-anchor', 'middle')
      .attr('fill', '#000000')
      .text('Azimuth (degrees)');

    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .attr('fill', '#000000')
      .text(getMetricLabel(filters.metric));

    const g = svg.append('g');

    // Fetch and process data
    fetch('/data/output.csv')
      .then(response => response.text())
      .then(text => {
        // Remove newlines and split on commas but not within brackets
        const cleanText = text.replace(/\n/g, '');
        const parts = cleanText.split(/,(?![^[]*\])/);
        
        // Get the first 11 values as labels
        const labels = parts.slice(0, 11);
        
        // Get the rest of the values and group them in sets of 11
        const values = parts.slice(11);
        const groupedValues: (string | number[])[][] = [];
        
        for (let i = 0; i < values.length; i += 11) {
          const group: (string | number[])[] = values.slice(i, i + 11);
          // Parse the 7th value (index 6) into a float array
          if (typeof group[6] === 'string' && group[6].includes('[')) {
            const floatArray = (group[6] as string)
              .match(/\[(.*?)\]/g)
              ?.map(item => item.replace(/[\[\]]/g, '').trim())
              .map(num => parseFloat(num))
              .filter(num => !isNaN(num));
            
            group[6] = floatArray || group[6];
          }
          groupedValues.push(group);
        }

        console.log('Labels:', labels);
        console.log('Grouped Values:', groupedValues);

        // Create data points
        const data: DataPoint[] = groupedValues.map((group, i) => ({
          azimuth: i * 15 - 75,
          value: parseFloat(group[getMetricIndex(filters.metric)])
        }));

        // Create scales and draw visualization
        const xScale = d3.scaleLinear()
          .domain([-75, 75])
          .range([50, width - 50]);

        const yScale = d3.scaleLinear()
          .domain(d3.extent(data, d => d.value) as [number, number])
          .range([height - 50, 50]);

        // Draw line
        const line = d3.line<DataPoint>()
          .x(d => xScale(d.azimuth))
          .y(d => yScale(d.value))
          .curve(d3.curveMonotoneX);

        g.append('path')
          .datum(data)
          .attr('fill', 'none')
          .attr('stroke', '#000000')
          .attr('stroke-width', 3)
          .attr('stroke-opacity', 0.8)
          .attr('d', line);

        // Add axes
        const xAxis = d3.axisBottom(xScale);
        const yAxis = d3.axisLeft(yScale);

        g.append('g')
          .attr('transform', `translate(0,${height - 50})`)
          .call(xAxis)
          .call(g => {
            g.selectAll('line')
              .attr('stroke', '#000000')
              .attr('stroke-width', 1.5)
              .attr('stroke-opacity', 0.5);
            g.selectAll('text')
              .attr('fill', '#000000')
              .attr('fill-opacity', 0.8);
          });

        g.append('g')
          .attr('transform', 'translate(50,0)')
          .call(yAxis)
          .call(g => {
            g.selectAll('line')
              .attr('stroke', '#000000')
              .attr('stroke-width', 1.5)
              .attr('stroke-opacity', 0.5);
            g.selectAll('text')
              .attr('fill', '#000000')
              .attr('fill-opacity', 0.8);
          });
      });
  }, [displayType, filters]);

  return (
    <div className="w-full flex flex-col items-center p-4">
      <div className="mb-4 space-x-4">
        {/* Controls */}
        <select 
          value={displayType}
          onChange={(e) => setDisplayType(e.target.value as 'line' | 'heatmap')}
          className="border rounded p-1 bg-white dark:bg-gray-800"
        >
          <option value="line">Line Plot</option>
          <option value="heatmap">Heatmap</option>
        </select>

        {displayType === 'line' && (
          <>
            {Object.entries({
              Aid: ['Occ', 'Unaid'],
              Room: ['Ane', 'Room'],
              Condition: ['spond'],
              Run: ['mean', '1', '2', '3', '4', '5', '6'],
              Metric: ['normILD', 'rawILD', 'normITD', 'rawITD'],
              Freq: FREQUENCIES.map((f, i) => ({
                value: i.toString(),
                label: f.toFixed(1)
              }))
            }).map(([label, options]) => (
              <div key={label} className="inline-block">
                <label className="mr-2">{label}: </label>
                <select 
                  value={filters[label.toLowerCase() as keyof FilterOptions]}
                  onChange={(e) => setFilters({
                    ...filters,
                    [label.toLowerCase()]: label === 'Freq' ? Number(e.target.value) : e.target.value
                  })}
                  className="border rounded p-1 bg-white dark:bg-gray-800"
                >
                  {label === 'Freq' 
                    ? (options as {value: string, label: string}[]).map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label} Hz
                        </option>
                      ))
                    : (options as string[]).map(option => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))
                  }
                </select>
              </div>
            ))}
          </>
        )}
      </div>
      <div className="w-full flex justify-center">
        <svg ref={svgRef} className="bg-white rounded-lg shadow-lg" />
      </div>
    </div>
  );
} 