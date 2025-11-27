
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, PanResponder, Animated, GestureResponderEvent, PanResponderInstance } from 'react-native';
import Svg, { Circle, Line, G, Path, Text as SvgText } from 'react-native-svg';
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

interface SimulationNode extends d3.SimulationNodeDatum, Node {
    targetX?: number;
    targetY?: number;
    fx?: number | null;
    fy?: number | null;
}

// Helper for distance
const getDistance = (touches: any[]) => {
    const [t1, t2] = touches;
    const dx = t1.pageX - t2.pageX;
    const dy = t1.pageY - t2.pageY;
    return Math.sqrt(dx * dx + dy * dy);
};

// GraphNode Component
const GraphNode = React.memo(({
    node,
    simulation,
    onNodeClick,
    scale,
    tags,
    isMobile,
    nodeRadius
}: {
    node: SimulationNode;
    simulation: d3.Simulation<SimulationNode, undefined> | null;
    onNodeClick: (node: Node) => void;
    scale: number;
    tags: Tag[];
    isMobile: boolean;
    nodeRadius: number;
}) => {
    // Use refs to keep track of latest props without re-creating PanResponder
    const nodeRef = useRef(node);
    const simulationRef = useRef(simulation);
    const scaleRef = useRef(scale);
    const onNodeClickRef = useRef(onNodeClick);

    // Update refs on every render
    useEffect(() => {
        nodeRef.current = node;
        simulationRef.current = simulation;
        scaleRef.current = scale;
        onNodeClickRef.current = onNodeClick;
    }, [node, simulation, scale, onNodeClick]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                const sim = simulationRef.current;
                const n = nodeRef.current;
                if (!sim) return;

                sim.alphaTarget(0.3).restart();
                (n as any)._dragStartX = n.x;
                (n as any)._dragStartY = n.y;
                n.fx = n.x;
                n.fy = n.y;
            },
            onPanResponderMove: (event, gestureState) => {
                const sim = simulationRef.current;
                const n = nodeRef.current;
                const s = scaleRef.current;
                if (!sim) return;

                const startX = (n as any)._dragStartX || 0;
                const startY = (n as any)._dragStartY || 0;
                n.fx = startX + gestureState.dx / s;
                n.fy = startY + gestureState.dy / s;
                sim.restart();
            },
            onPanResponderRelease: (e, gestureState) => {
                const sim = simulationRef.current;
                const n = nodeRef.current;
                if (!sim) return;

                if (Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5) {
                    onNodeClickRef.current(n);
                }
                n.fx = null;
                n.fy = null;
                sim.alphaTarget(0);
            },
        })
    ).current;

    return (
        <G
            transform={`translate(${node.x || 0}, ${node.y || 0})`}
            {...panResponder.panHandlers}
        >
            <Circle
                r={nodeRadius}
                fill={tags.find(t => t.name === node.tags[0])?.color || "#cbd5e1"}
                stroke="#1a202c"
                strokeWidth={isMobile ? 1.5 : 2}
            />
            <SvgText
                y={isMobile ? 14 : 18}
                fill="rgba(255,255,255,0.9)"
                fontSize={isMobile ? 9 : 10}
                textAnchor="middle"
            >
                {node.title.length > (isMobile ? 10 : 14) ? node.title.substring(0, (isMobile ? 8 : 11)) + '...' : node.title}
            </SvgText>
        </G>
    );
});

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
    // State for simulation nodes to trigger re-renders
    const [simNodes, setSimNodes] = useState<SimulationNode[]>([]);
    const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });

    // Refs for PanResponder
    const lastTransform = useRef({ x: 0, y: 0, k: 1 });
    const lastDistance = useRef<number | null>(null);
    const transformRef = useRef(transform);
    const onBackgroundClickRef = useRef(onBackgroundClick);

    // Update refs
    useEffect(() => {
        transformRef.current = transform;
        onBackgroundClickRef.current = onBackgroundClick;
    }, [transform, onBackgroundClick]);

    // We use a ref to keep track of the simulation instance
    const simulationRef = useRef<d3.Simulation<SimulationNode, undefined> | null>(null);

    const bgPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                lastTransform.current = transformRef.current;
                const touches = evt.nativeEvent.touches;
                if (touches.length === 2) {
                    lastDistance.current = getDistance(touches);
                } else {
                    lastDistance.current = null;
                }
            },
            onPanResponderMove: (evt, gestureState) => {
                const touches = evt.nativeEvent.touches;

                // Handle transition from 1 to 2 fingers
                if (touches.length === 2 && lastDistance.current === null) {
                    lastDistance.current = getDistance(touches);
                    lastTransform.current = transformRef.current; // Reset base transform for zoom
                    return;
                }

                if (touches.length === 1 && lastDistance.current === null) {
                    // Pan
                    setTransform({
                        x: lastTransform.current.x + gestureState.dx,
                        y: lastTransform.current.y + gestureState.dy,
                        k: lastTransform.current.k
                    });
                } else if (touches.length === 2) {
                    // Zoom
                    const dist = getDistance(touches);
                    if (lastDistance.current) {
                        const scaleFactor = dist / lastDistance.current;
                        const newScale = Math.max(0.5, Math.min(3, lastTransform.current.k * scaleFactor));
                        setTransform(prev => ({
                            ...prev,
                            k: newScale
                        }));
                    }
                }
            },
            onPanResponderRelease: (evt, gestureState) => {
                if (Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5 && !lastDistance.current) {
                    onBackgroundClickRef.current();
                }
                lastDistance.current = null;
                // Update lastTransform on release so next gesture starts from here
                lastTransform.current = transformRef.current;
            }
        })
    ).current;

    const isMobile = width < 640;
    const margin = isMobile ? 25 : 40;
    const radius = Math.min(width, height) / 2 - margin;
    const centerX = width / 2;
    const centerY = height / 2;
    const isZoomed = !!activeTag;

    const nodeRadius = isMobile ? 6 : 8;
    const collisionRadius = isMobile ? 10 : 14;

    // Scales
    const radialScale = useMemo(() => d3.scaleBand<string>()
        .domain(DIFFICULTY_LEVELS)
        .range([radius * 0.2, radius]), [radius]);

    const angularScale = useMemo(() => d3.scaleBand<string>()
        .domain(tags.map(t => t.name))
        .range([0, 2 * Math.PI]), [tags]);

    // Background Sectors
    const sectors = useMemo(() => {
        const arc = d3.arc<Tag>()
            .innerRadius(0)
            .outerRadius(radius)
            .startAngle(d => angularScale(d.name)!)
            .endAngle(d => angularScale(d.name)! + angularScale.bandwidth());

        return tags.map(tag => ({
            tag,
            path: arc(tag) || ""
        }));
    }, [tags, radius, angularScale]);

    // Difficulty Rings
    const rings = useMemo(() => {
        return DIFFICULTY_LEVELS.map(diff => ({
            diff,
            r: (radialScale(diff) ?? 0) + radialScale.bandwidth() / 2
        }));
    }, [radialScale]);

    // Initialize Simulation
    useEffect(() => {
        // Prepare nodes
        const initialNodes: SimulationNode[] = nodes.map(node => {
            const angle = (angularScale(node.tags[0]) ?? 0) + angularScale.bandwidth() / 2;
            const r = (radialScale(node.difficulty) ?? 0) + radialScale.bandwidth() / 2;

            // Preserve existing positions if available (from previous sim state) to avoid jumping
            // For now, we just recalculate or use random. 
            // In a real app, we might want to merge with existing simNodes.
            return {
                ...node,
                targetX: r * Math.cos(angle - Math.PI / 2),
                targetY: r * Math.sin(angle - Math.PI / 2),
                x: isZoomed ? (Math.random() - 0.5) * 50 : (r * Math.cos(angle - Math.PI / 2) + (Math.random() - 0.5) * 10),
                y: isZoomed ? (Math.random() - 0.5) * 50 : (r * Math.sin(angle - Math.PI / 2) + (Math.random() - 0.5) * 10),
            };
        });

        const links = nodes.flatMap(source =>
            source.links.map(targetId => {
                const targetExists = nodes.find(n => n.id === targetId);
                return targetExists ? { source: source.id, target: targetId } : null;
            }).filter(Boolean) as { source: string, target: string }[]
        );

        const simulation = d3.forceSimulation<SimulationNode>(initialNodes)
            .force("link", d3.forceLink(links).id((d: any) => d.id).strength(0))
            .force("charge", d3.forceManyBody().strength(isMobile ? -10 : -20))
            .force("collide", d3.forceCollide(collisionRadius));

        if (isZoomed) {
            simulation.force("radial", d3.forceRadial<SimulationNode>(d => {
                return (radialScale(d.difficulty) ?? 0) + radialScale.bandwidth() / 2;
            }).strength(0.8));
        } else {
            simulation
                .force("x", d3.forceX<SimulationNode>(d => d.targetX!).strength(0.2))
                .force("y", d3.forceY<SimulationNode>(d => d.targetY!).strength(0.2));
        }

        simulation.on("tick", () => {
            // Create a new array to trigger re-render
            setSimNodes([...initialNodes]);
        });

        simulationRef.current = simulation;

        return () => {
            simulation.stop();
        };
    }, [nodes, tags, width, height, activeTag, isZoomed, isMobile, radius, collisionRadius, angularScale, radialScale]);

    // Links for rendering
    const renderedLinks = useMemo(() => {
        // We need to map links to current node positions
        // The simulation modifies the 'links' array objects if we passed them to forceLink.
        // However, we re-created links in useEffect. 
        // We can just find source/target in simNodes.

        return nodes.flatMap(sourceNode => {
            // If activeTag is set, only show links where both nodes are in the active tag
            if (activeTag && !sourceNode.tags.includes(activeTag)) return [];

            const source = simNodes.find(n => n.id === sourceNode.id);
            if (!source) return [];

            return sourceNode.links.map(targetId => {
                const targetNode = nodes.find(n => n.id === targetId);
                // Filter target if activeTag is set
                if (activeTag && targetNode && !targetNode.tags.includes(activeTag)) return null;

                const target = simNodes.find(n => n.id === targetId);
                if (!target) return null;
                return { source, target };
            }).filter(Boolean) as { source: SimulationNode, target: SimulationNode }[];
        });
    }, [simNodes, nodes, activeTag]);

    // Pan/Zoom State (Simple implementation)
    // For now, we just center the graph. 
    // Implementing full d3-zoom in RN is complex without a library like d3-zoom-handler-rn or using PanResponder + scale.
    // We'll stick to static centered view for MVP.

    return (
        <View style={{ width, height, overflow: 'hidden' }} {...bgPanResponder.panHandlers}>
            <Svg width={width} height={height}>
                <G transform={`translate(${centerX + transform.x}, ${centerY + transform.y}) scale(${transform.k})`}>
                    {/* Background Sectors */}
                    {sectors.map((sector, i) => (
                        <G key={sector.tag.name}>
                            {/* Visual sector */}
                            <Path
                                d={sector.path}
                                fill={sector.tag.color}
                                fillOpacity={isZoomed ? 0.1 : 0.05}
                                stroke="#ffffff"
                                strokeOpacity={0.05}
                            />
                            {/* Invisible clickable overlay - larger hit area */}
                            <Path
                                d={sector.path}
                                fill={sector.tag.color}
                                fillOpacity={0.01}
                                stroke="transparent"
                                strokeWidth={20}
                                onPress={() => !isZoomed && onTagClick(sector.tag.name)}
                            />
                        </G>
                    ))}

                    {/* Sector Labels */}
                    {sectors.map((sector) => {
                        const angle = (angularScale(sector.tag.name)! + angularScale.bandwidth() / 2) - Math.PI / 2;
                        const labelR = radius + (isMobile ? 15 : 25);
                        const x = labelR * Math.cos(angle);
                        const y = labelR * Math.sin(angle);
                        return (
                            <SvgText
                                key={sector.tag.name}
                                x={x}
                                y={y}
                                fill="rgba(255,255,255,0.7)"
                                fontSize={isMobile ? 10 : 11}
                                fontWeight="bold"
                                textAnchor="middle"
                                alignmentBaseline="middle"
                                onPress={() => onTagClick(sector.tag.name)}
                            >
                                {sector.tag.name}
                            </SvgText>
                        );
                    })}

                    {/* Difficulty Rings */}
                    {rings.map(ring => (
                        <Circle
                            key={ring.diff}
                            r={ring.r}
                            fill="none"
                            stroke="#4A5568"
                            strokeOpacity={0.3}
                            strokeDasharray="4 4"
                        />
                    ))}

                    {/* Links */}
                    {renderedLinks.map((link, i) => (
                        <Line
                            key={i}
                            x1={link.source.x}
                            y1={link.source.y}
                            x2={link.target.x}
                            y2={link.target.y}
                            stroke="#cbd5e1"
                            strokeOpacity={0.3}
                            strokeWidth={isMobile ? 1 : 1.5}
                        />
                    ))}

                    {/* Nodes */}
                    {simNodes.map(node => {
                        // If activeTag is set, only render nodes that belong to it
                        if (activeTag && !node.tags.includes(activeTag)) return null;

                        return (
                            <GraphNode
                                key={node.id}
                                node={node}
                                simulation={simulationRef.current}
                                onNodeClick={onNodeClick}
                                scale={transform.k}
                                tags={tags}
                                isMobile={isMobile}
                                nodeRadius={nodeRadius}
                            />
                        );
                    })}
                </G>
            </Svg>
        </View>
    );
};

export default GraphView;
