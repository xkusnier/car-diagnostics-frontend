// CRA helper spusti meranie vykonu iba vtedy, ked dostane callback.
const reportWebVitals = onPerfEntry => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    // Dynamicky import nenacitava web-vitals, pokial sa meranie nepouzije.
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
};

// Export pouziva index.js pri inicializacii aplikacie.
export default reportWebVitals;
