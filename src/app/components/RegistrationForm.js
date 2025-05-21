const RegistrationForm = () => {
    return (
      <div className="formulario hidden">
        <h3>Registrate para la beca y saber más del proyecto:</h3>
        <form id="registro" action="/submit-form" method="POST">
          <div>
            <label htmlFor="nickname">Nickname:</label>
            <input type="text" id="nickname" name="nickname" required />
          </div>
          <div>
            <label htmlFor="email">Email:</label>
            <input type="email" id="email" name="email" required />
          </div>
          <div className="labelComentario">
            <label htmlFor="comentario">Comentarios:</label>
            <textarea id="comentario" name="comentario" rows="4" />
          </div>
          <div>
            <button className="bn enviar">Enviar</button>
          </div>
        </form>
      </div>
    );
  };
  
  export default RegistrationForm;
  