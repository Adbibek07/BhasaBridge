import React from "react";
import NavigationBar from "./Dashboard/NavigationBar/NavigationBar";
import "../App.css"; // optional global styles

function LandingPage() {
  return (
    <div>
      {/* <NavigationBar /> */}
      <main className="min-h-screen text-black">
        <h1>Welcome to My App!</h1>
        <p>This is the landing page of our React project.</p>
        <button>Get Started</button>
      </main>
    </div>
  );
}

export default LandingPage;
