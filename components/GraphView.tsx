
import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { Node, Tag } from '../types';
import { DIFFICULTY_LEVELS } from '../constants';

interface GraphViewProps {
  nodes: Node[];
  tags: Tag[];
  onNodeClick: (node: Node) => void;
  onTagClick: (tagName: string) => void;
  onBackgroundClick: () => void;
  activeTag: string | null;
  width: number;
  height: number;
}

// Extend Node type for D3 simulation
interface SimulationNode extends d3.SimulationNodeDatum, Node {
  targetX?: number;
  targetY?: number;
}

const GraphView: React.FC<GraphViewProps> = ({ 
    nodes, 
    tags, 
    onNodeClick, 
    onTagClick,
    onBackgroundClick,
    activeTag,
    width, 
    height 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !width || !height) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    const isMobile = width < 640;
    const margin = isMobile ? 25 : 40;
    const radius = Math.min(width, height) / 2 - margin;
    const centerX = width / 2;
    const centerY = height / 2;
    const isZoomed = !!activeTag;
    
    // Mobile adjustments
    const nodeRadius = isMobile ? 6 : 8;
    const labelFontSize = isMobile ? "9px" : "10px";
    const sectorLabelFontSize = isMobile ? "10px" : "11px";
    const collisionRadius = isMobile ? 10 : 14;

    // Handle background click for reset
    svg.on("click", (event) => {
        // If the event target is the svg element itself, treat as background click
        if (event.target === svgRef.current) {
            onBackgroundClick();
        }
    });

    const g = svg.append("g").attr("transform", `translate(${centerX},${centerY})`);

    // Scales
    const radialScale = d3.scaleBand()
      .domain(DIFFICULTY_LEVELS)
      .range([radius * 0.2, radius]);

    const angularScale = d3.scaleBand()
      .domain(tags.map(t => t.name))
      .range([0, 2 * Math.PI]);

    // Draw sectors for tags (Background)
    const arc = d3.arc<any>()
      .innerRadius(0)
      .outerRadius(radius)
      .startAngle(d => angularScale(d.name)!)
      .endAngle(d => angularScale(d.name)! + angularScale.bandwidth());

    // When zoomed, the sector fills the whole circle.
    // We want clicks on the sector to trigger zoom only if NOT already zoomed.
    // If zoomed, we want clicks on the background (empty space) to fall through to SVG to reset.
    // So we set pointer-events: none on the sector when zoomed.
    
    g.selectAll(".sector")
      .data(tags)
      .join("path")
      .attr("class", "sector")
      .attr("d", arc)
      .attr("fill", d => d.color)
      .attr("fill-opacity", isZoomed ? 0.1 : 0.05)
      .attr("stroke", "#ffffff")
      .attr("stroke-opacity", 0.05)
      .style("cursor", isZoomed ? "default" : "pointer")
      .style("pointer-events", isZoomed ? "none" : "all") 
      .on("click", (event, d) => {
          if (!isZoomed) {
              event.stopPropagation();
              onTagClick(d.name);
          }
      });

    g.selectAll(".sector-label")
      .data(tags)
      .join("text")
      .attr("class", "sector-label")
      .attr("x", d => (radius + (isMobile ? 10 : 20)) * Math.cos(angularScale(d.name)! + angularScale.bandwidth() / 2 - Math.PI / 2))
      .attr("y", d => (radius + (isMobile ? 10 : 20)) * Math.sin(angularScale(d.name)! + angularScale.bandwidth() / 2 - Math.PI / 2))
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "middle")
      .attr("fill", "rgba(255,255,255,0.7)")
      .style("font-size", sectorLabelFontSize)
      .style("font-weight", "500")
      .style("cursor", "pointer")
      .text(d => d.name)
      .on("click", (event, d) => {
          event.stopPropagation();
          onTagClick(d.name);
      });

    // Draw rings for difficulty (Background)
    g.selectAll(".ring")
      .data(DIFFICULTY_LEVELS)
      .join("circle")
      .attr("class", "ring")
      .attr("r", d => radialScale(d)! + radialScale.bandwidth() / 2)
      .attr("fill", "none")
      .attr("stroke", "#4A5568") // gray-600
      .attr("stroke-opacity", 0.3)
      .attr("stroke-dasharray", "4 4")
      .style("pointer-events", "none"); // Let clicks pass through rings

    // Prepare Simulation Data
    // We calculate the "Ideal" (Target) position for each node based on the radial layout.
    const simulationNodes: SimulationNode[] = nodes.map(node => {
      // If zoomed, angularScale has only 1 domain, bandwidth is 2PI. 
      // We don't use this target for zoomed mode, we use radial force.
      const angle = (angularScale(node.tags[0]) ?? 0) + angularScale.bandwidth() / 2;
      const r = (radialScale(node.difficulty) ?? 0) + radialScale.bandwidth() / 2;
      return {
        ...node,
        targetX: r * Math.cos(angle - Math.PI / 2),
        targetY: r * Math.sin(angle - Math.PI / 2),
        // Randomize initial position slightly to prevent perfect stacking if they start at 0,0
        x: isZoomed ? (Math.random() - 0.5) * 50 : (r * Math.cos(angle - Math.PI / 2) + (Math.random() - 0.5) * 10),
        y: isZoomed ? (Math.random() - 0.5) * 50 : (r * Math.sin(angle - Math.PI / 2) + (Math.random() - 0.5) * 10),
      };
    });

    const simulationLinks = nodes.flatMap(source => 
        source.links.map(targetId => {
             // Only include links if target is also in the visible nodes list
             const targetExists = nodes.find(n => n.id === targetId);
             return targetExists ? { source: source.id, target: targetId } : null;
        }).filter(Boolean) as {source: string, target: string}[]
    );

    // Forces
    const simulation = d3.forceSimulation<SimulationNode>(simulationNodes)
      .force("link", d3.forceLink(simulationLinks).id((d: any) => d.id).strength(0)) // Link force mainly for reference, visually weak
      .force("charge", d3.forceManyBody().strength(isMobile ? -10 : -20)) 
      .force("collide", d3.forceCollide(collisionRadius));

    if (isZoomed) {
        // In zoomed mode, we distribute nodes around the full circle based on difficulty rings.
        simulation.force("radial", d3.forceRadial<SimulationNode>(d => {
            return (radialScale(d.difficulty) ?? 0) + radialScale.bandwidth() / 2;
        }).strength(0.8));
    } else {
        // In overview mode, pull towards the sector center.
        simulation
            .force("x", d3.forceX<SimulationNode>(d => d.targetX!).strength(0.2))
            .force("y", d3.forceY<SimulationNode>(d => d.targetY!).strength(0.2));
    }

    // Render Elements
    
    // Links
    const linkSelection = g.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(simulationLinks)
      .join("line")
      .attr("stroke", "#cbd5e1")
      .attr("stroke-opacity", 0.3)
      .attr("stroke-width", isMobile ? 1 : 1.5);

    // Nodes
    const nodeSelection = g.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(simulationNodes)
      .join("g")
      .attr("class", "node-group")
      .style("cursor", "grab");

    // Node Circle
    nodeSelection.append("circle")
      .attr("r", nodeRadius)
      .attr("fill", d => tags.find(t => t.name === d.tags[0])?.color || "#cbd5e1")
      .attr("stroke", "#1a202c")
      .attr("stroke-width", isMobile ? 1.5 : 2)
      .on("mouseover", function() { d3.select(this).attr("stroke", "#fff"); })
      .on("mouseout", function() { d3.select(this).attr("stroke", "#1a202c"); });

    // Node Label
    nodeSelection.append("text")
      .attr("y", isMobile ? 14 : 18)
      .attr("text-anchor", "middle")
      .attr("fill", "rgba(255,255,255,0.9)")
      .style("font-size", labelFontSize)
      .style("pointer-events", "none")
      .style("text-shadow", "0 1px 2px rgba(0,0,0,0.8)")
      .text(d => d.title.length > (isMobile ? 10 : 14) ? d.title.substring(0, (isMobile ? 8 : 11)) + '...' : d.title);

    // Drag Behavior
    const drag = d3.drag<SVGGElement, SimulationNode>()
        .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
            d3.select(event.sourceEvent.target).style("cursor", "grabbing");
        })
        .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
        })
        .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
            d3.select(event.sourceEvent.target).style("cursor", "grab");
        });

    nodeSelection.call(drag as any);

    // Handle Click
    nodeSelection.on("click", (event, d) => {
        if (event.defaultPrevented) return; 
        event.stopPropagation(); // Prevent background click logic
        onNodeClick(d);
    });

    // Update positions
    simulation.on("tick", () => {
      linkSelection
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      nodeSelection.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 8])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);
    // Center the graph
    svg.call(zoom.transform, d3.zoomIdentity.translate(centerX, centerY));


    return () => {
      simulation.stop();
    };

  }, [nodes, tags, width, height, onNodeClick, onTagClick, onBackgroundClick, activeTag]);

  return <svg ref={svgRef} width={width} height={height} className="cursor-move block touch-none"></svg>;
};

export default GraphView;
