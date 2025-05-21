import FloatingInfo from "./components/floatingInfo.js";
import Network from "./components/network.js";

const IndexPage = () => {

  return (
    <>
      {/* Cargamos los scripts externos */}
      <Network />

      <h1 className="floatingTitle">TROPICAL PONCHO</h1>
      <label className="checkbtn" htmlFor="check">
        <i className="material-icons">clear_all</i>
      </label>
      <input name="check" id="check" type="checkbox" />

      <FloatingInfo />
    </>

  );
};

export default IndexPage;