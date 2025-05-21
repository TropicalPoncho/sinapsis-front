'use client';

import React, { useState, useEffect } from "react";
import dynamic from 'next/dynamic';

// Importar Mundo con opción de no renderizar nada en el servidor
const MundoDynamic = dynamic(
  () => import('../lib/mundo.js'),
  { 
    ssr: false,
    loading: () => <div className="w-full h-screen bg-black" /> 
  }
);

const Network = ({ order = 1 }) => {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const handleNodeSelection = (node) => {
    console.log("Nodo seleccionado:", node);
  };

  // No renderiza absolutamente nada relacionado con Mundo durante SSR
  if (!isClient) {
    return <div className="absolute w-full min-h-screen bg-black" />;
  }

  return (
    <div className="absolute w-full min-h-screen">
      <MundoDynamic 
        elementId="network" 
        order={order} 
        showNeuronsCallBack={handleNodeSelection} 
        arActive={false} 
      />
    </div>
  );
};

export default Network;