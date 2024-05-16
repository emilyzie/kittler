import React from 'react';

function Header({ toggleLogin, toggleSignup, showLogin, showSignup }) {
  return (
    <header className="bg-zinc-700 text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <div className="my-1 mr-6">
            <h1 className="font-bold text-2xl text-left">Kittler</h1>
            <h2 className="italic text-left">switch off all apparatuses.</h2>
          </div>
        </div>
        <nav className="flex items-center">
          <button 
            onClick={(e) => {
              toggleLogin();
              e.stopPropagation(); // Stop the event from propagating to the document
            }}
            className={`text-white btn shadow-[0_9px_0_rgb(0,0,0)] hover:shadow-[0_4px_0px_rgb(0,0,0)] hover:translate-y-1 transition-all inline-block p-2 ml-4 bg-stone-400 hover:bg-stone-500 rounded ${showLogin ? 'bg-stone-500' : ''}`}
          >
            Login
          </button>
          <button 
            onClick={(e) => {
              toggleSignup();
              e.stopPropagation(); // Stop the event from propagating to the document
            }}
            className={`btn shadow-[0_9px_0_rgb(0,0,0)] hover:shadow-[0_4px_0px_rgb(0,0,0)] hover:translate-y-1 transition-all inline-block p-2 ml-4 bg-stone-500 hover:bg-stone-600 rounded ${showSignup ? 'bg-stone-600' : ''}`}
          >
            Register
          </button>
        </nav>
      </div>
    </header>
  );
}

export default Header;