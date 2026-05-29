import protectedRoute from "../common/ProtectedRoute";


function Help() {
  return (
    <div>
      <h2>Help</h2>
    </div>
  );
}

export default protectedRoute(Help);