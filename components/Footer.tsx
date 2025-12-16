import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 py-4 mt-auto no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500 gap-2">
        <div>
          Powered by <a href="https://www.ebeesnet.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors">Paul Chang @ eBees Network</a>
        </div>
        <div>
          Version 1.0.0
        </div>
      </div>
    </footer>
  );
};

export default Footer;