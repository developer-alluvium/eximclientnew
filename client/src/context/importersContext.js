import { createContext, useContext, useState } from "react";

export const ImportersContext = createContext();

export const ImportersProvider = ({ children }) => {
  const [importers, setImporters] = useState(null);
  const [selectedImporter, setSelectedImporter] = useState(null); // Add selectedImporter state

  return (
    <ImportersContext.Provider
      value={{ importers, setImporters, selectedImporter, setSelectedImporter }}
    >
      {children}
    </ImportersContext.Provider>
  );
};

export const useImportersContext = () => {
  return useContext(ImportersContext);
};
