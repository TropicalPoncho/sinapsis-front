'use client';
import { useEffect, useRef, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import {ThreeObjectManager}  from './threeObjects/ThreeObjectManager.js';
import Stats from 'three/addons/libs/stats.module';

//mport { CSS2DRenderer } from '//unpkg.com/three/examples/jsm/renderers/CSS2DRenderer.js';

const colorsArray = [
    "#8AE2C8", //verde
    "#578CCB", //azul
    "#9900FF", //violeta
    "#FF0074", //magenta
    "#FFBC00", //amarillo
    "#111111", //"negro"
    "#FFFFFF" //blanco
];

const globalDefaultSettings = {
    nodeSize: 8,
    cameraDistance: 350,
    aimDistance: 100,
    aimOffsetX: 20,
    aimOffsetY: 30,
    aimOffsetZ: 70,
    activeNodeImg: true,
    imgSize: 50,
    linkDistance: 50,
    LINK_WIDTH: .5,
    LINK_OPACITY: 0.8,
    LINK_PARTICLE_WIDTH: 1,
    LINK_PARTICLE_COUNT: 4,
    LINK_PARTICLE_SPEED: 4 * 0.001
};

export default function Mundo({ elementId, order, showNeuronsCallBack, arActive = false }) {
    const graphRef = useRef();
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    const [loadedNeurons, setLoadedNeurons] = useState([]);
    const [hoverNode, setHoverNode] = useState(null);
    const [highlightLinks, setHighlightLinks] = useState([]);
    
    const threeObjectManagerRef = useRef(null);
    const statsRef = useRef();
    const originalCameraPositionRef = useRef();
    const elementsRef = useRef([]);

    useEffect(() => {
        // Inicializar ThreeObjectManager solo en el cliente
        threeObjectManagerRef.current = new ThreeObjectManager({animationType: 'Hover'});
        
        // Inicialización
        statsRef.current = new Stats();
        statsRef.current.showPanel(0);
        document.body.appendChild(statsRef.current.dom);

        // Cargar datos iniciales
        insertNodesFromApi(order, 0);

        return () => {
            // Cleanup
            if (statsRef.current && statsRef.current.dom && statsRef.current.dom.parentNode) {
                statsRef.current.dom.parentNode.removeChild(statsRef.current.dom);
            }
        };
    }, [order]);

    // Función para animar un nodo cuando el cursor está sobre él
    const animateNode = (node, stay = false) => {
        if (!threeObjectManagerRef.current) return;
        if ((!node && !threeObjectManagerRef.current.objectToAnimate) || (node && hoverNode === node)) return;

        if (stay) {
            threeObjectManagerRef.current.objectToAnimate = null;
        }

        const newHighlightLinks = [];
        if (node) {
            threeObjectManagerRef.current.objectToAnimate = node.id;
            const newLinks = graphData.links.filter(link => link.source.id == node.id || link.target.id == node.id);
            setHighlightLinks(newLinks);
        } else {
            setHighlightLinks([]);
        }

        setHoverNode(node || null);
    };

    // Función para activar un nodo cuando es clickeado
    const activeNode = (node) => {
        try {
            animateNode(node, true);
            node.side = aimNode(node);
        } catch (error) {
            console.log(error);
        }
        return node;
    };

    // Función para apuntar la cámara hacia un nodo
    const aimNode = (node) => {
        if (!graphRef.current) return;
        
        // Aim at node from outside it
        const distance = globalDefaultSettings.aimDistance;
        const distRatio = 1 + distance/Math.hypot(node.x, node.y);

        const lookAt = {
            x: node.x + (Math.sign(node.x) * globalDefaultSettings.aimOffsetX), 
            y: node.y, 
            z: node.z
        };
        
        const newPos = node.x || node.y || node.z
            ? { x: node.x, y: node.y, z: node.z + distance }
            : { x: 0, y: 0, z: distance }; // special case if node is in (0,0,0)

        const side = getSide(newPos, lookAt, node); 

        console.log("newPos x " + Math.round(newPos.x) + " lookAt x" + Math.round(lookAt.x));
        
        graphRef.current.cameraPosition(
            newPos, // new position
            lookAt, // lookAt ({ x, y, z })
            3000    // ms transition duration
        );

        return side;
    };

    // Función para determinar el lado en que se encuentra un objeto
    const getSide = (camPosition, camDirection, objPosition) => {
        if (camPosition.z < objPosition.z) {
            return camDirection.x > objPosition.x ? "izq" : "der";
        } else {
            return camDirection.x < objPosition.x ? "izq" : "der";
        }
    };

    // Función para volver a la vista principal
    const backToBasicsView = (extra = 0, cameraDistanceOffset = 0) => {
        if (!graphRef.current) return;
        
        graphRef.current.cameraPosition(
            {x: 0, y: 0, z: globalDefaultSettings.cameraDistance + cameraDistanceOffset}, // new position
            {x: 0, y: extra, z: 0}, // lookAt ({ x, y, z })
            3000  // ms transition duration
        );
    };

    // Función para insertar nodos desde la API
    const insertNodesFromApi = (order, page) => {
        /* $.get( `/neurons`, {page: page}, ( neurons) => {
            if(neurons.length != 0){
                setLoadedNeurons(neurons);
                let filtered = neurons.filter(item => item.order == order);
                insertNodes(filtered);
                //Hacerlo recursivo?
            }else{ //Cuando termina de cargar
                //setTimeout(() => { manageNewNeurons(); }, 5000);
            }
        }); */
    };

    // Activar zoom para ajustar todo el grafo
    const activateZoomToFit = () => {
        if (!graphRef.current) return;
        graphRef.current.zoomToFit(700);
    };

    // Activar un nodo por ID
    const activeNodeById = (neuronId) => {
        const nodes = graphData.nodes;
        const filterNode = nodes.find(item => item.id == neuronId);
        if (filterNode) {
            activeNode(filterNode);
        }
        return filterNode;
    };

    // Ir a un nodo específico
    const goToNeuron = (neuronId) => {
        // Si ya existe:
        if (graphData.nodes.find(node => node.id == neuronId)) {
            const node = activeNodeById(neuronId);
            showNeuronsCallBack(node);
        } else {
            insertNodesById([neuronId], neuronId);
        }
    };

    // Insertar nodos por ID
    const insertNodesById = (nodeIds, nextIdToShow = false) => {
        if (!loadedNeurons) return;
        
        // Si encuentro los nodos ya cargados pero no insertados:
        const newGraphData = loadedNeurons.filter(node => nodeIds.includes(node.id.toString()));
        if (!newGraphData) {
            return;
        }
        insertNodes(newGraphData, nextIdToShow);
    };

    // Insertar nodos en el grafo
    const insertNodes = (newGraphData, nextIdToShow = false) => {
        setGraphData(prevGraphData => {
            const updatedNodes = [...prevGraphData.nodes, ...newGraphData];
            const updatedLinks = [...prevGraphData.links, ...createLinks(updatedNodes)];
            
            const updatedGraphData = {
                nodes: updatedNodes,
                links: updatedLinks
            };
            
            if (nextIdToShow && graphRef.current) {
                graphRef.current.onEngineStop(() => {
                    const node = activeNodeById(nextIdToShow);
                    showNeuronsCallBack(node);
                    graphRef.current.onEngineStop(() => {});
                });
            }
            
            return updatedGraphData;
        });
    };

    // Crear enlaces entre nodos
    const createLinks = (nodes) => {
        const nodeLinks = [];
        nodes.forEach(node => {
            if (node.links) {
                node.links.forEach(link => {
                    if (nodes.find(item => item.id == link.id)) {
                        const newLink = {
                            source: link.id,
                            target: node.id
                        };
                        
                        newLink.distance = link.distance ?? globalDefaultSettings.linkDistance;
                        nodeLinks.push(newLink);
                    }
                });
            }
        });
        return nodeLinks;
    };

    // Agregar elemento
    const addElement = (element) => {
        elementsRef.current = [...elementsRef.current, element];
    };

    // Si threeObjectManager aún no está inicializado (durante el renderizado del servidor), no renderizar
    if (!threeObjectManagerRef.current) {
        return null;
    }

    return (
        <ForceGraph3D
            ref={graphRef}
            graphData={graphData}
            nodeThreeObject={node => threeObjectManagerRef.current.createObject(node)}
            controlType='orbit'
            backgroundColor="#000011"
            linkWidth={globalDefaultSettings.LINK_WIDTH}
            linkOpacity={globalDefaultSettings.LINK_OPACITY}
            linkDirectionalParticleWidth={globalDefaultSettings.LINK_PARTICLE_WIDTH}
            linkDirectionalParticles={globalDefaultSettings.LINK_PARTICLE_COUNT}
            linkDirectionalParticleSpeed={globalDefaultSettings.LINK_PARTICLE_SPEED}
            linkCurvature={0.4}
            linkCurveRotation={0.1}
            numDimensions={3}
            cooldownTicks={100}
            nodeLabel="name"
            onNodeHover={node => animateNode(node)}
            onNodeClick={node => {
                activeNode(node);
                showNeuronsCallBack(node);
            }}
            d3Force={('link', link => {
                link.distance(link => link.distance);
            })}
        />
    );
}

/* function update()
{
	if ( keyboard.pressed("p") )
		video.play();
		
	if ( keyboard.pressed("space") )
		video.pause();

	if ( keyboard.pressed("s") ) // stop video
	{
		video.pause();
		video.currentTime = 0;
	}
	
	if ( keyboard.pressed("r") ) // rewind video
		video.currentTime = 0;

    if( keyboard.pressed("c") ){
        console.log(JSON.stringify(Graph.cameraPosition()));
    }
	
}
 */




