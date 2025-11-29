import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, PanResponder, Animated, GestureResponderEvent, PanResponderInstance, TouchableOpacity, Text, ScrollView } from 'react-native';
import Svg, { Circle, Line, G, Path, Text as SvgText } from 'react-native-svg';
import * as d3 from 'd3';
import tw from 'twrnc';
import { Node, Tag } from '../types';
import { isUnassigned } from '../utils';
import { DIFFICULTY_LEVELS } from '../constants';

interface GraphViewProps {
    nodes: Node[];
    tags: Tag[];
    onNodeClick: (node: Node) => void;
    onTagClick: (tagName: string) => void;
    onBackgroundClick: () => void;
    activeTag: string | null | 'UNASSIGNED';
    width: number;
    height: number;
    showDifficulty: boolean;
    visibleTagsState: Record<string, boolean>;
    onToggleTagVisibility: (tagName: string) => void;
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

// GraphNode Component - Purely presentational now
const GraphNode = React.memo(({
    node,
    x,
    y,
    tags,
    isMobile,
    nodeRadius
}: {
    node: SimulationNode;
    x?: number;
    y?: number;
    tags: Tag[];
    isMobile: boolean;
    nodeRadius: number;
}) => {
    // Use neutral gray for unassigned nodes, otherwise use tag color
    const nodeColor = isUnassigned(node)
        ? "#94a3b8" // slate-400
        : (tags.find(t => t.name === node.tags[0])?.color || "#cbd5e1");

    return (
        <G transform={`translate(${x || 0}, ${y || 0})`}>
            <Circle
                r={nodeRadius}
                fill={nodeColor}
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

// Icons
const EyeIcon = ({ color = "currentColor" }: { color?: string }) => (
    <Svg width="16" height="16" viewBox="0 0 20 20" fill={color}>
        <Path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
        <Path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
    </Svg>
);

const EyeOffIcon = ({ color = "currentColor" }: { color?: string }) => (
    <Svg width="16" height="16" viewBox="0 0 20 20" fill={color}>
        <Path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
        <Path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
    </Svg>
);

const GraphView = React.memo(({
    nodes,
    tags,
    onNodeClick,
    onTagClick,
    onBackgroundClick,
    activeTag,
    width,
    height,
    showDifficulty,
    visibleTagsState,
    onToggleTagVisibility
}: GraphViewProps) => {
    // State for simulation nodes to trigger re-renders
    const [simNodes, setSimNodes] = useState<SimulationNode[]>([]);
    const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
    const [isLegendOpen, setIsLegendOpen] = useState(false);

    // Refs for PanResponder
    const lastTransform = useRef({ x: 0, y: 0, k: 1 });
    const lastDistance = useRef<number | null>(null);
    const transformRef = useRef(transform);
    const onBackgroundClickRef = useRef(onBackgroundClick);
    const onNodeClickRef = useRef(onNodeClick);
    const onTagClickRef = useRef(onTagClick);
    const simNodesRef = useRef<SimulationNode[]>([]);
    const activeTagRef = useRef(activeTag);
    const dimensionsRef = useRef({ width, height });
    const angularScaleRef = useRef<d3.ScaleBand<string> | null>(null);

    // Dragging state
    const draggingNode = useRef<SimulationNode | null>(null);
    const dragStartPos = useRef<{ x: number, y: number } | null>(null);

    // Update refs
    useEffect(() => {
        transformRef.current = transform;
        onBackgroundClickRef.current = onBackgroundClick;
        onNodeClickRef.current = onNodeClick;
        onTagClickRef.current = onTagClick;
        activeTagRef.current = activeTag;
        dimensionsRef.current = { width, height };
    }, [transform, onBackgroundClick, onNodeClick, onTagClick, activeTag, width, height]);

    // We use a ref to keep track of the simulation instance
    const simulationRef = useRef<d3.Simulation<SimulationNode, undefined> | null>(null);

    const isMobile = width < 640;
    const margin = isMobile ? 25 : 40;
    const radius = Math.min(width, height) / 2 - margin;
    const unassignedRadius = radius + (isMobile ? 60 : 80); // Outer ring for unassigned nodes
    const centerX = width / 2;
    const centerY = height / 2;
    const isZoomed = !!activeTag && activeTag !== 'UNASSIGNED';

    const nodeRadius = isMobile ? 6 : 8;
    const collisionRadius = isMobile ? 10 : 14;

    // Helper to find node at coordinates
    const findNodeAt = (x: number, y: number) => {
        // Use refs to get latest values inside PanResponder closure
        const { width, height } = dimensionsRef.current;
        const cx = width / 2;
        const cy = height / 2;
        const isMobile = width < 640;
        const nodeRadius = isMobile ? 6 : 8;

        const tx = transformRef.current.x;
        const ty = transformRef.current.y;
        const k = transformRef.current.k;

        const graphX = (x - cx - tx) / k;
        const graphY = (y - cy - ty) / k;

        // Use a larger hit radius for easier grabbing
        const hitRadius = nodeRadius * 3;

        const currentSimNodes = simNodesRef.current;
        const currentActiveTag = activeTagRef.current;

        // Search in reverse order (top-most rendered node first)
        for (let i = currentSimNodes.length - 1; i >= 0; i--) {
            const node = currentSimNodes[i];
            // Skip nodes not in active tag if zoomed
            if (currentActiveTag && !node.tags.includes(currentActiveTag)) continue;

            const dx = graphX - (node.x || 0);
            const dy = graphY - (node.y || 0);
            if (dx * dx + dy * dy < hitRadius * hitRadius) {
                return node;
            }
        }
        return null;
    };

    // Helper to find tag sector at coordinates
    const findTagAt = (x: number, y: number) => {
        if (!angularScaleRef.current) return null;

        const { width, height } = dimensionsRef.current;
        const cx = width / 2;
        const cy = height / 2;
        const tx = transformRef.current.x;
        const ty = transformRef.current.y;
        const k = transformRef.current.k;

        // Convert to graph coordinates relative to center
        const graphX = (x - cx - tx) / k;
        const graphY = (y - cy - ty) / k;

        // Calculate radius and angle
        const r = Math.sqrt(graphX * graphX + graphY * graphY);
        let angle = Math.atan2(graphY, graphX) + Math.PI / 2; // Adjust for d3 arc starting at 12 o'clock (0 rads is 12 o'clock in our logic?)
        // Actually d3.arc 0 is 12 o'clock. Math.atan2 0 is 3 o'clock.
        // Our angular scale range is [0, 2PI].
        // Let's normalize angle to [0, 2PI].

        // Wait, d3.arc startAngle 0 is 12 o'clock.
        // Math.atan2(y, x): 0 is 3 o'clock (positive x).
        // So 12 o'clock is -PI/2.
        // To map atan2 to d3 arc:
        // angle = atan2(y, x) + PI/2.
        // If result < 0, add 2PI.

        if (angle < 0) angle += 2 * Math.PI;

        // Check if radius is within sector bounds
        // Inner radius 0, Outer radius 'radius'
        if (r > radius) return null;

        // Find which band the angle falls into
        const domain = angularScaleRef.current.domain();
        for (const tagName of domain) {
            const start = angularScaleRef.current(tagName) || 0;
            const width = angularScaleRef.current.bandwidth();
            const end = start + width;

            if (angle >= start && angle < end) {
                return tagName;
            }
        }

        return null;
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                const touches = evt.nativeEvent.touches;
                const { locationX, locationY } = evt.nativeEvent;

                // Check if we hit a node first (only for single touch)
                if (touches.length === 1) {
                    const node = findNodeAt(locationX, locationY);
                    if (node && simulationRef.current) {
                        draggingNode.current = node;
                        dragStartPos.current = { x: locationX, y: locationY };

                        // Fix the node
                        node.fx = node.x;
                        node.fy = node.y;

                        // Restart simulation with low alpha to allow movement but keep others stable
                        simulationRef.current.alphaTarget(0.3).restart();
                        return;
                    }
                }

                // If no node hit, or multi-touch, handle background
                lastTransform.current = transformRef.current;
                if (touches.length === 2) {
                    lastDistance.current = getDistance(touches);
                } else {
                    lastDistance.current = null;
                }
            },
            onPanResponderMove: (evt, gestureState) => {
                const touches = evt.nativeEvent.touches;

                // Handle Node Dragging
                if (draggingNode.current && simulationRef.current) {
                    const k = transformRef.current.k;
                    const { locationX, locationY } = evt.nativeEvent;
                    const tx = transformRef.current.x;
                    const ty = transformRef.current.y;
                    const { width, height } = dimensionsRef.current;
                    const cx = width / 2;
                    const cy = height / 2;

                    draggingNode.current.fx = (locationX - cx - tx) / k;
                    draggingNode.current.fy = (locationY - cy - ty) / k;

                    simulationRef.current.restart();
                    return;
                }

                // Handle Background Pan/Zoom

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
                const { locationX, locationY } = evt.nativeEvent;

                if (draggingNode.current && simulationRef.current) {
                    // Check for click (minimal movement)
                    const dist = Math.sqrt(gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy);
                    if (dist < 5) {
                        onNodeClickRef.current(draggingNode.current);
                    }

                    // Release node
                    draggingNode.current.fx = null;
                    draggingNode.current.fy = null;
                    draggingNode.current = null;
                    dragStartPos.current = null;

                    // Cool down simulation
                    simulationRef.current.alphaTarget(0);
                    return;
                }

                // Background Click / Tag Click
                if (Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5 && !lastDistance.current) {
                    // Check if we clicked a tag sector
                    // Only if not zoomed (if zoomed, background click usually resets zoom)
                    if (!activeTagRef.current || activeTagRef.current === 'UNASSIGNED') {
                        const clickedTag = findTagAt(locationX, locationY);
                        if (clickedTag) {
                            onTagClickRef.current(clickedTag);
                            return;
                        }
                    }

                    onBackgroundClickRef.current();
                }
                lastDistance.current = null;
                lastTransform.current = transformRef.current;
            }
        })
    ).current;

    // Scales
    const radialScale = useMemo(() => d3.scaleBand<string>()
        .domain(DIFFICULTY_LEVELS)
        .range([radius * 0.2, radius]), [radius]);

    // Filter tags based on visibility
    const visibleTagsList = useMemo(() => {
        return tags.filter(t => visibleTagsState[t.name] !== false);
    }, [tags, visibleTagsState]);

    const angularScale = useMemo(() => d3.scaleBand<string>()
        .domain(visibleTagsList.map(t => t.name))
        .range([0, 2 * Math.PI]), [visibleTagsList]);

    // Update ref for hit testing
    useEffect(() => {
        angularScaleRef.current = angularScale;
    }, [angularScale]);

    // Background Sectors
    const sectors = useMemo(() => {
        if (visibleTagsList.length === 0) return [];

        const arc = d3.arc<Tag>()
            .innerRadius(0)
            .outerRadius(radius)
            .startAngle(d => angularScale(d.name)!)
            .endAngle(d => angularScale(d.name)! + angularScale.bandwidth());

        return visibleTagsList.map(tag => ({
            tag,
            path: arc(tag) || ""
        }));
    }, [visibleTagsList, radius, angularScale]);

    // Difficulty Rings
    const rings = useMemo(() => {
        return DIFFICULTY_LEVELS.map(diff => ({
            diff,
            r: (radialScale(diff) ?? 0) + radialScale.bandwidth() / 2
        }));
    }, [radialScale]);

    // Initialize Simulation
    useEffect(() => {
        // Separate unassigned nodes from tagged nodes
        const unassignedNodes = nodes.filter(isUnassigned);

        // Filter tagged nodes based on visibility
        // If a node's primary tag is hidden, hide the node
        const taggedNodes = nodes.filter(n => {
            if (isUnassigned(n)) return false;
            const primaryTag = n.tags[0];
            return visibleTagsState[primaryTag] !== false;
        });

        const activeNodes = [...unassignedNodes, ...taggedNodes];

        // Prepare nodes
        const initialNodes: SimulationNode[] = activeNodes.map((node, index) => {
            if (isUnassigned(node)) {
                // Position unassigned nodes on outer ring - no targetX/targetY to allow free movement
                const unassignedIndex = unassignedNodes.findIndex(n => n.id === node.id);
                const baseAngle = (2 * Math.PI * unassignedIndex) / Math.max(unassignedNodes.length, 1);

                return {
                    ...node,
                    // Initial position only, no target to allow free movement within ring
                    x: unassignedRadius * Math.cos(baseAngle - Math.PI / 2) + (Math.random() - 0.5) * 20,
                    y: unassignedRadius * Math.sin(baseAngle - Math.PI / 2) + (Math.random() - 0.5) * 20,
                };
            } else {
                // Tagged nodes use existing sector-based positioning
                const angle = (angularScale(node.tags[0]) ?? 0) + angularScale.bandwidth() / 2;

                // If difficulty is shown, use difficulty radius. Otherwise, use middle of sector.
                const r = showDifficulty
                    ? (radialScale(node.difficulty) ?? 0) + radialScale.bandwidth() / 2
                    : radius * 0.6; // Middle of the donut

                return {
                    ...node,
                    targetX: r * Math.cos(angle - Math.PI / 2),
                    targetY: r * Math.sin(angle - Math.PI / 2),
                    x: isZoomed ? (Math.random() - 0.5) * 50 : (r * Math.cos(angle - Math.PI / 2) + (Math.random() - 0.5) * 10),
                    y: isZoomed ? (Math.random() - 0.5) * 50 : (r * Math.sin(angle - Math.PI / 2) + (Math.random() - 0.5) * 10),
                };
            }
        });

        const links = activeNodes.flatMap(source =>
            source.links.map(targetId => {
                const targetExists = activeNodes.find(n => n.id === targetId);
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
            // Apply different forces for unassigned vs tagged nodes
            simulation
                .force("x", d3.forceX<SimulationNode>(d => {
                    return isUnassigned(d) ? 0 : d.targetX!;
                }).strength(d => isUnassigned(d) ? 0 : (showDifficulty ? 0.2 : 0.05))) // Weaker force if difficulty hidden
                .force("y", d3.forceY<SimulationNode>(d => {
                    return isUnassigned(d) ? 0 : d.targetY!;
                }).strength(d => isUnassigned(d) ? 0 : (showDifficulty ? 0.2 : 0.05))) // Weaker force if difficulty hidden
                .force("radialUnassigned", d3.forceRadial<SimulationNode>(d => {
                    return isUnassigned(d) ? unassignedRadius : 0;
                }).strength(d => isUnassigned(d) ? 0.8 : 0));
        }

        simulation.on("tick", () => {
            // Update ref for immediate access in PanResponder
            simNodesRef.current = initialNodes;
            // Create a new array to trigger re-render
            setSimNodes([...initialNodes]);
        });

        simulationRef.current = simulation;

        return () => {
            simulation.stop();
        };
    }, [nodes, tags, width, height, activeTag, isZoomed, isMobile, radius, unassignedRadius, collisionRadius, angularScale, radialScale, showDifficulty, visibleTagsState]);

    // Links for rendering
    const renderedLinks = useMemo(() => {
        // We need to map links to current node positions
        // The simulation modifies the 'links' array objects if we passed them to forceLink.
        // However, we re-created links in useEffect. 
        // We can just find source/target in simNodes.

        return nodes.flatMap(sourceNode => {
            // If activeTag is UNASSIGNED, only show links where both nodes are unassigned
            if (activeTag === 'UNASSIGNED') {
                if (!isUnassigned(sourceNode)) return [];
            } else if (activeTag && !sourceNode.tags.includes(activeTag)) {
                // If activeTag is set (not UNASSIGNED), only show links where both nodes are in the active tag
                return [];
            }

            const source = simNodes.find(n => n.id === sourceNode.id);
            if (!source) return [];

            return sourceNode.links.map(targetId => {
                const targetNode = nodes.find(n => n.id === targetId);

                // Filter target based on activeTag
                if (activeTag === 'UNASSIGNED') {
                    if (targetNode && !isUnassigned(targetNode)) return null;
                } else if (activeTag && targetNode && !targetNode.tags.includes(activeTag)) {
                    return null;
                }

                const target = simNodes.find(n => n.id === targetId);
                if (!target) return null;
                return { source, target };
            }).filter(Boolean) as { source: SimulationNode, target: SimulationNode }[];
        });
    }, [simNodes, nodes, activeTag]);

    return (
        <View style={{ width, height, overflow: 'hidden' }} {...panResponder.panHandlers}>
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
                    {showDifficulty && rings.map(ring => (
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
                        // Filter nodes based on activeTag
                        if (activeTag === 'UNASSIGNED') {
                            if (!isUnassigned(node)) return null;
                        } else if (activeTag && !node.tags.includes(activeTag)) {
                            return null;
                        }

                        return (
                            <GraphNode
                                key={node.id}
                                node={node}
                                x={node.x}
                                y={node.y}
                                tags={tags}
                                isMobile={isMobile}
                                nodeRadius={nodeRadius}
                            />
                        );
                    })}
                </G>
            </Svg>

            {/* Legend Overlay */}
            <View style={tw`absolute bottom-6 left-6 z-50 flex-col-reverse items-start gap-2`}>
                <TouchableOpacity
                    onPress={() => setIsLegendOpen(!isLegendOpen)}
                    style={tw`bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 flex-row items-center justify-between min-w-[140px] shadow-lg`}
                >
                    <Text style={tw`text-white font-bold text-sm`}>Legend</Text>
                    <Text style={tw`text-gray-400 text-xs ml-2`}>{isLegendOpen ? '▼' : '▲'}</Text>
                </TouchableOpacity>

                {isLegendOpen && (
                    <View style={tw`bg-gray-900 border border-gray-700 rounded-lg p-2 max-h-64 w-[200px] shadow-xl`}>
                        <ScrollView showsVerticalScrollIndicator={true}>
                            {[...tags].sort((a, b) => b.totalXp - a.totalXp).map(tag => (
                                <View
                                    key={tag.name}
                                    style={tw`flex-row items-center justify-between py-2 px-2 border-b border-gray-800 rounded`}
                                >
                                    <TouchableOpacity
                                        onPress={() => onTagClick(tag.name)}
                                        style={tw`flex-row items-center flex-1`}
                                    >
                                        <View style={[tw`w-3 h-3 rounded-full mr-2`, { backgroundColor: tag.color }]} />
                                        <Text style={tw`text-gray-300 text-xs font-medium flex-1`} numberOfLines={1}>{tag.name}</Text>
                                    </TouchableOpacity>

                                    <View style={tw`flex-row items-center gap-2`}>
                                        <Text style={tw`text-gray-500 text-[10px] font-mono`}>{tag.totalXp} XP</Text>
                                        <TouchableOpacity onPress={() => onToggleTagVisibility(tag.name)}>
                                            {visibleTagsState[tag.name] !== false ? (
                                                <EyeIcon color="#9ca3af" />
                                            ) : (
                                                <EyeOffIcon color="#6b7280" />
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                            {/* Unassigned Legend Item */}
                            <View
                                key="UNASSIGNED"
                                style={tw`flex-row items-center justify-between py-2 px-2 border-b border-gray-800 rounded`}
                            >
                                <View style={tw`flex-row items-center flex-1`}>
                                    <View style={[tw`w-3 h-3 rounded-full mr-2`, { backgroundColor: '#94a3b8' }]} />
                                    <Text style={tw`text-gray-300 text-xs font-medium flex-1`} numberOfLines={1}>Unassigned</Text>
                                </View>

                                <View style={tw`flex-row items-center gap-2`}>
                                    <TouchableOpacity onPress={() => onToggleTagVisibility('UNASSIGNED')}>
                                        {visibleTagsState['UNASSIGNED'] !== false ? (
                                            <EyeIcon color="#9ca3af" />
                                        ) : (
                                            <EyeOffIcon color="#6b7280" />
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                )}
            </View>
        </View>
    );
});

export default GraphView;
