
import React, { useState } from 'react';
import { Tag } from '../types';
import { DIFFICULTY_LEVELS, XP_MAP } from '../constants';

interface GraphLegendProps {
    tags: Tag[];
}

const GraphLegend: React.FC<GraphLegendProps> = ({ tags }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="absolute bottom-4 left-4 max-w-xs w-full sm:w-auto z-20 transition-all duration-300">
            <div className={`bg-gray-800 bg-opacity-90 backdrop-blur-sm rounded-lg shadow-lg overflow-hidden border border-gray-700 ${isExpanded ? 'p-4' : 'p-3'}`}>
                <div 
                    className="flex justify-between items-center cursor-pointer select-none" 
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <h3 className="font-bold text-sm sm:text-base text-white">Legend</h3>
                    <button className="text-gray-400 hover:text-white focus:outline-none ml-2">
                        {isExpanded ? (
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                             </svg>
                        ) : (
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                             </svg>
                        )}
                    </button>
                </div>
                
                {isExpanded && (
                    <div className="mt-3 space-y-3 text-sm animate-fadeIn">
                        <div>
                            <h4 className="font-semibold text-gray-300 mb-2 text-xs uppercase tracking-wide">Skill Domains</h4>
                            <div className="flex flex-wrap gap-2">
                                {tags.map(tag => (
                                    <div key={tag.name} className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-gray-700" style={{ backgroundColor: `${tag.color}15` }}>
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }}></div>
                                        <span className="text-xs text-gray-200">{tag.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                         <div>
                            <h4 className="font-semibold text-gray-300 mb-2 text-xs uppercase tracking-wide">Difficulty</h4>
                            <ul className="space-y-1">
                                {DIFFICULTY_LEVELS.map((level, i) => (
                                     <li key={level} className="flex items-center gap-2">
                                        <div className="w-12 text-right text-gray-400 text-xs">Ring {i+1}</div>
                                        <div className="flex-1 text-gray-200 text-xs">{level} ({XP_MAP[level]} XP)</div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GraphLegend;
