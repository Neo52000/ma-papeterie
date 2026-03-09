import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="text-center px-4">
        <h1 className="text-8xl font-bold text-primary/20 font-poppins">404</h1>
        <h2 className="mt-4 text-2xl font-semibold text-foreground font-poppins">
          Page non trouvée
        </h2>
        <p className="mt-3 text-muted-foreground max-w-md mx-auto">
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        <Link
          to="/"
          className="inline-block mt-6 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
