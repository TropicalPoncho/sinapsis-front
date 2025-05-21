const FloatingMenu = () => {
    const menuItems = [
      { id: "nosotres", text: "CONCEPTO", neuronId: "0" },
      { id: "obras", text: "OBRAS", neuronId: "1" },
      { id: "audiovisuales", text: "AUDIOVISUALES", neuronId: "2" },
      { id: "editorial", text: "EDITORIAL", neuronId: "3" },
      { id: "proyectos", text: "TECNOLOGÍA", neuronId: "4" },
      { id: "laboratorios", text: "LABORATORIOS", neuronId: "5" },
      { id: "amigues", text: "AMIGUES", neuronId: "6" },
      { id: "contacto", text: "CONTACTO", neuronId: "7" }
    ];
  
    return (
      <div className="floatingMenu">
        {menuItems.map(item => (
          <button key={item.id} className="bn" id={item.id} neuronid={item.neuronId}>
            {item.text}
          </button>
        ))}
      </div>
    );
  };
  
  export default FloatingMenu;
  