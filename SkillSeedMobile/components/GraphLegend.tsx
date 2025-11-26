
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import tw from 'twrnc';
import { Tag } from '../types';

interface GraphLegendProps {
    tags: Tag[];
}

const GraphLegend: React.FC<GraphLegendProps> = ({ tags }) => {
    return (
        <View style={tw`absolute bottom-20 left-4 z-10 max-h-40`}>
            <Text style={tw`text-white text-xs font-bold mb-2`}>Domains</Text>
            <ScrollView style={tw`max-h-32`} showsVerticalScrollIndicator={false}>
                {tags.map(tag => (
                    <View key={tag.name} style={tw`flex-row items-center mb-1`}>
                        <View style={[tw`w-3 h-3 rounded-full mr-2`, { backgroundColor: tag.color }]} />
                        <Text style={tw`text-gray-300 text-xs`}>{tag.name}</Text>
                        <Text style={tw`text-gray-500 text-[10px] ml-2`}>({tag.totalXp} XP)</Text>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

export default GraphLegend;
