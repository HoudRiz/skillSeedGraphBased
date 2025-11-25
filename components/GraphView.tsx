import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';
import { Node, Tag, Difficulty } from '../types';
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

interface PositionedNode extends Node {
  x: number;
  y: number;
}

const difficultyIndex: Record<Difficulty, number> = {
  [Difficulty.Easy]: 1,
  [Difficulty.Medium]: 2,
  [Difficulty.Hard]: 3,
};

const GraphView: React.FC<GraphViewProps> = ({
  nodes,
  tags,
  onNodeClick,
  onTagClick,
  onBackgroundClick,
  activeTag,
  width,
  height,
}) => {
  const layout = useMemo(() => {
    const minSide = Math.max(Math.min(width, height) - 32, 200);
    const radius = minSide / 2;
    const centerX = width / 2;
    const centerY = height / 2;
    const ringSpacing = radius / (DIFFICULTY_LEVELS.length + 1);

    const angleMap = new Map<string, number>();
    const filteredTags = tags.filter((t) => !activeTag || t.name === activeTag);
    filteredTags.forEach((tag, index) => {
      angleMap.set(tag.name, (2 * Math.PI * index) / filteredTags.length);
    });

    const placedNodes: PositionedNode[] = nodes.map((node, index) => {
      const angle = angleMap.get(node.tags[0]) ?? ((2 * Math.PI) / nodes.length) * index;
      const ring = difficultyIndex[node.difficulty];
      const distance = ringSpacing * ring;
      const jitter = (index % 5) * 6;
      const x = centerX + (distance + jitter) * Math.cos(angle - Math.PI / 2);
      const y = centerY + (distance + jitter) * Math.sin(angle - Math.PI / 2);
      return { ...node, x, y };
    });

    const linkSegments = placedNodes.flatMap((source) =>
      source.links
        .map((targetId) => {
          const target = placedNodes.find((n) => n.id === targetId);
          if (!target) return null;
          return { source, target };
        })
        .filter(Boolean) as { source: PositionedNode; target: PositionedNode }[]
    );

    return {
      centerX,
      centerY,
      ringSpacing,
      radius,
      placedNodes,
      linkSegments,
      filteredTags,
    };
  }, [nodes, tags, width, height, activeTag]);

  return (
    <View style={styles.container}>
      <Svg width={width} height={height}>
        <Rect width={width} height={height} fill="#0f172a" onPress={onBackgroundClick} />

        {DIFFICULTY_LEVELS.map((difficulty, index) => (
          <Circle
            key={difficulty}
            cx={layout.centerX}
            cy={layout.centerY}
            r={layout.ringSpacing * (index + 1)}
            stroke="#334155"
            strokeDasharray="6 6"
            fill="none"
            opacity={0.6}
          />
        ))}

        {layout.filteredTags.map((tag) => {
          const angle =
            layout.filteredTags.length === 1
              ? -Math.PI / 2
              : (2 * Math.PI * layout.filteredTags.indexOf(tag)) / layout.filteredTags.length - Math.PI / 2;
          const labelDistance = layout.radius + 12;
          return (
            <G key={tag.name}>
              <SvgText
                x={layout.centerX + labelDistance * Math.cos(angle)}
                y={layout.centerY + labelDistance * Math.sin(angle)}
                fill="#cbd5e1"
                fontSize={14}
                fontWeight="500"
                textAnchor="middle"
                onPress={() => onTagClick(tag.name)}
              >
                {tag.name}
              </SvgText>
            </G>
          );
        })}

        {layout.linkSegments.map(({ source, target }) => (
          <Line
            key={`${source.id}-${target.id}`}
            x1={source.x}
            y1={source.y}
            x2={target.x}
            y2={target.y}
            stroke="#94a3b8"
            strokeOpacity={0.35}
            strokeWidth={2}
          />
        ))}

        {layout.placedNodes.map((node) => {
          const color = tags.find((t) => t.name === node.tags[0])?.color ?? '#6366f1';
          return (
            <G key={node.id} onPress={() => onNodeClick(node)}>
              <Circle cx={node.x} cy={node.y} r={12} fill={color} stroke="#0f172a" strokeWidth={2} />
              <SvgText
                x={node.x}
                y={node.y + 22}
                fill="#e2e8f0"
                fontSize={12}
                fontWeight="500"
                textAnchor="middle"
              >
                {node.title.length > 14 ? `${node.title.slice(0, 12)}…` : node.title}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default GraphView;
