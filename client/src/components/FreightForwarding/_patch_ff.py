from pathlib import Path

p = Path(r"C:\Users\india\Desktop\projects\eximclientnew\client\src\components\FreightForwarding\CFreightForwarding.jsx")
text = p.read_text(encoding="utf-8")

start = text.find("  const getCurrencySymbol = (curr) => {")
ret = text.find("\n  return (\n", start)
docs = text.find("\nfunction DocsViewCell")
assert ret != -1 and docs != -1, (ret, docs)

historic_return = r'''
  return (
    <div className="ff-historic-card">
      <div className="ff-historic-title">Historic Freight Rates Lookup</div>
      <form onSubmit={handleSearch} className="ff-historic-form">
        <div ref={polRef} style={{ display: "flex", flexDirection: "column", gap: "4px", position: "relative" }}>
          <span className="ff-field-label">PORT OF LOADING (POL)</span>
          <input
            value={pol}
            onChange={(e) => {
              setPol(e.target.value);
              setShowPolDropdown(true);
            }}
            onFocus={() => setShowPolDropdown(true)}
            placeholder="Search or select POL..."
            className="ff-field-input"
            autoComplete="off"
          />
          {showPolDropdown && (polOptions.length > 0 || loadingPol) && (
            <div className="ff-dropdown">
              {loadingPol ? (
                <div style={{ padding: "8px 12px", fontSize: "12px", color: "#64748b" }}>Searching...</div>
              ) : (
                polOptions.map((opt, idx) => (
                  <div
                    key={idx}
                    className="ff-dropdown-item"
                    onMouseDown={() => {
                      setPol(opt);
                      setShowPolDropdown(false);
                    }}
                  >
                    {opt}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <div ref={podRef} style={{ display: "flex", flexDirection: "column", gap: "4px", position: "relative" }}>
          <span className="ff-field-label">PORT OF DESTINATION (POD)</span>
          <input
            value={pod}
            onChange={(e) => {
              setPod(e.target.value);
              setShowPodDropdown(true);
            }}
            onFocus={() => setShowPodDropdown(true)}
            placeholder="Search or select POD..."
            className="ff-field-input"
            autoComplete="off"
          />
          {showPodDropdown && (podOptions.length > 0 || loadingPod) && (
            <div className="ff-dropdown">
              {loadingPod ? (
                <div style={{ padding: "8px 12px", fontSize: "12px", color: "#64748b" }}>Searching...</div>
              ) : (
                podOptions.map((opt, idx) => (
                  <div
                    key={idx}
                    className="ff-dropdown-item"
                    onMouseDown={() => {
                      setPod(opt);
                      setShowPodDropdown(false);
                    }}
                  >
                    {opt}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <button type="submit" disabled={loading} className="ff-search-btn">
          {loading ? "Searching..." : "Search Rates"}
        </button>
      </form>

      <div className="ff-historic-table-wrap">
        <table className="ff-table">
          <thead>
            <tr>
              {["Job No", "S/Line", "Forwarder", "Date", "Currency", "Exchange Rate", "Amount", "Amount (INR)"].map(
                (h) => (
                  <th
                    key={h}
                    style={{ textAlign: h.includes("Amount") || h === "Exchange Rate" ? "right" : "left" }}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="ff-empty">
                  Searching historical rates...
                </td>
              </tr>
            ) : rates.length === 0 ? (
              <tr>
                <td colSpan={8} className="ff-empty">
                  No historical rates found. Enter routing criteria to search.
                </td>
              </tr>
            ) : (
              rates.map((rate, idx) => (
                <tr key={idx}>
                  <td className="ff-id">{rate.jobNo}</td>
                  <td>{rate.shippingLine || "-"}</td>
                  <td>{rate.forwarder || "-"}</td>
                  <td>
                    {rate.date
                      ? typeof rate.date === "string"
                        ? rate.date
                        : new Date(rate.date).toLocaleDateString("en-GB")
                      : "-"}
                  </td>
                  <td>
                    <span className="ff-chip ff-chip-blue">{rate.currency || "INR"}</span>
                  </td>
                  <td style={{ textAlign: "right", color: "#64748b" }}>{rate.exchangeRate || "-"}</td>
                  <td style={{ textAlign: "right", fontWeight: 600, color: "#0f766e" }}>
                    {rate.amountOriginal !== undefined
                      ? `${getCurrencySymbol(rate.currency)}${rate.amountOriginal.toLocaleString()}`
                      : "-"}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>
                    ₹{rate.amountINR ? rate.amountINR.toLocaleString() : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
'''

text = text[: ret + 1] + historic_return + text[docs + 1 :]

marker = "  const outlinedBtnSx = {"
idx = text.find(marker)
assert idx != -1

new_tail = Path(r"C:\Users\india\Desktop\projects\eximclientnew\client\src\components\FreightForwarding\_ff_tail.jsx.txt").read_text(encoding="utf-8")
text = text[:idx] + new_tail

assert "dropDownStyle" not in text
assert "s.wrapper" not in text
assert "visibleTabs.map" in text
assert 'className="ff-module"' in text

p.write_text(text, encoding="utf-8")
print("OK", len(text))
