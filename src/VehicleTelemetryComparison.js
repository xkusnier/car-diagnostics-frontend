import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { api } from "./api";
import "./styles/global.css";
import {
  ExclamationTriangleIcon,
  TruckIcon,
  ArrowsUpDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  WrenchScrewdriverIcon,
  ChartBarIcon,
  MapIcon,
  TrashIcon,
  ShieldExclamationIcon,
  EllipsisVerticalIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";

// Obrazovka porovnava vozidla podla poslednych telemetry hodnot.
function VehicleTelemetryComparison({ onNavigate, user }) {
  // Zoznam vozidiel je zdroj pre tabulku aj prazdny stav.
  const [vehicles, setVehicles] = useState([]);
  const [summary, setSummary] = useState({
    totalVehicles: 0,
    onlineVehicles: 0,
    totalSamples: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: "online",
    direction: "desc",
  });
  const [deletingVin, setDeletingVin] = useState(null);
  const [openActionMenuVin, setOpenActionMenuVin] = useState(null);
  const [showDeleteConfirmVin, setShowDeleteConfirmVin] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [actionPopupStyle, setActionPopupStyle] = useState({});

  // Ref pomaha zistit klik mimo akcioveho menu.
  const actionMenuRef = useRef(null);
  // Pre kazde VIN sa uklada tlacidlo, podla ktoreho sa poziciuje popup.
  const triggerRefs = useRef({});

  // Admin rola ovplyvnuje dostupne akcie nad vozidlami.
  const isAdmin = user?.role === "admin";

  // Po otvoreni obrazovky sa nacita porovnanie vozidiel.
  useEffect(() => {
    fetchTelemetryComparison();
    const interval = setInterval(fetchTelemetryComparison, 30000);
    return () => clearInterval(interval);
  }, []);

  // Druhy efekt zatvara akciove menu klikom mimo neho.
  useEffect(() => {
    const handleClickOutside = (event) => {
      const popupEl = actionMenuRef.current;
      const triggerEl = openActionMenuVin
        ? triggerRefs.current[openActionMenuVin]
        : null;

      const clickedInsidePopup = popupEl && popupEl.contains(event.target);
      const clickedTrigger = triggerEl && triggerEl.contains(event.target);

      if (!clickedInsidePopup && !clickedTrigger) {
        setOpenActionMenuVin(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openActionMenuVin]);

  useLayoutEffect(() => {
    if (!openActionMenuVin) return;

    const handleReposition = () => updatePopupPosition(openActionMenuVin);

    handleReposition();
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [openActionMenuVin]);

  // Backend vracia posledne telemetry hodnoty pre vsetky vozidla pouzivatela.
  const fetchTelemetryComparison = async () => {
    try {
      // Token sa nastavi pred requestom, aby presla autorizacia.
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please login first");
        setLoading(false);
        return;
      }

      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      // Endpoint dodava data pre porovnavaciu tabulku.
      const response = await api.get("/api/vehicles/telemetry-comparison");

      if (response.data.status === "success") {
        setVehicles(response.data.vehicles || []);
        setSummary({
          totalVehicles: response.data.summary?.total_vehicles || 0,
          onlineVehicles: response.data.summary?.online_vehicles || 0,
          totalSamples: response.data.summary?.total_samples || 0,
        });
      }

      setError(null);
    } catch (fetchError) {
      console.error("Error fetching telemetry comparison:", fetchError);
      setError("Failed to load vehicle telemetry. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Mazanie vozidla sa robi podla VIN vybraneho riadku.
  const handleDeleteVehicle = async (vin) => {
    setDeletingVin(vin);

    try {
      const token = localStorage.getItem("token");
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      // Po zmazani sa tabulka nacita znova zo servera.
      await api.delete(`/api/user-vehicle/${vin}`);
      await fetchTelemetryComparison();

      setOpenActionMenuVin(null);
      setShowDeleteConfirmVin(null);
      setStatusMessage("Vehicle deleted successfully.");

      setTimeout(() => {
        setStatusMessage("");
      }, 3000);
    } catch (err) {
      console.error("Error deleting vehicle:", err);
      setError(err.response?.data?.error || "Failed to delete vehicle");
      setShowDeleteConfirmVin(null);
    } finally {
      setDeletingVin(null);
    }
  };

  // Klik na hlavicku tabulky prepina stlpec a smer triedenia.
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Triedenie pracuje s kopiou pola, nie priamo so stavom.
  const getSortedVehicles = () => {
    return [...vehicles].sort((a, b) => {
      let aVal;
      let bVal;

      // Podla aktivneho kluca sa vyberie hodnota na porovnanie.
      switch (sortConfig.key) {
        case "online":
          aVal = a.online ? 1 : 0;
          bVal = b.online ? 1 : 0;
          break;
        case "vin":
          aVal = a.vin || "ZZZ";
          bVal = b.vin || "ZZZ";
          break;
        case "brand":
          aVal = a.brand || "ZZZ";
          bVal = b.brand || "ZZZ";
          break;
        case "user_id":
          aVal = a.user_id ?? 999999999;
          bVal = b.user_id ?? 999999999;
          break;
        case "avg_speed":
          aVal = a.statistics?.avg_speed || -1;
          bVal = b.statistics?.avg_speed || -1;
          break;
        case "avg_rpm":
          aVal = a.statistics?.avg_rpm || -1;
          bVal = b.statistics?.avg_rpm || -1;
          break;
        case "avg_consumption":
          aVal = a.statistics?.avg_consumption || 999;
          bVal = b.statistics?.avg_consumption || 999;
          break;
        case "samples":
          aVal = a.statistics?.samples || 0;
          bVal = b.statistics?.samples || 0;
          break;
        default:
          aVal = a[sortConfig.key];
          bVal = b[sortConfig.key];
      }

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  };

  // Chybajuce cisla sa v tabulke zobrazia ako pomlcka.
  const formatNumber = (num, decimals = 1) => {
    if (num === null || num === undefined) return "—";
    return Number(num).toFixed(decimals);
  };

  // Ikona ukazuje aktualny smer triedenia stlpca.
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <ArrowsUpDownIcon style={{ width: "1rem", height: "1rem" }} />;
    }

    return sortConfig.direction === "asc" ? (
      <ArrowUpIcon style={{ width: "1rem", height: "1rem" }} />
    ) : (
      <ArrowDownIcon style={{ width: "1rem", height: "1rem" }} />
    );
  };

  // Online/offline stav sa mapuje na CSS triedu.
  const getStatusColor = (status) => {
    return status ? "success" : "danger";
  };

  // Pozicia popupu sa pocita z tlacidla v konkretnom riadku.
  const updatePopupPosition = (vin) => {
    const button = triggerRefs.current[vin];
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const popupWidth = 220;
    const estimatedPopupHeight = 300;
    const gap = 8;

    let left = rect.right - popupWidth;
    let top = rect.bottom + gap;

    if (left < 12) left = 12;
    if (left + popupWidth > window.innerWidth - 12) {
      left = window.innerWidth - popupWidth - 12;
    }

    if (top + estimatedPopupHeight > window.innerHeight - 12) {
      top = rect.top - estimatedPopupHeight - gap;
    }

    if (top < 12) {
      top = 12;
    }

    setActionPopupStyle({
      position: "fixed",
      top: `${top}px`,
      left: `${left}px`,
      width: `${popupWidth}px`,
      zIndex: 99999,
    });
  };

  // Klik bud otvori menu pre VIN, alebo zatvori uz otvorene menu.
  const toggleActionMenu = (vin) => {
    setOpenActionMenuVin((prev) => {
      const next = prev === vin ? null : vin;
      if (next) {
        requestAnimationFrame(() => updatePopupPosition(vin));
      }
      return next;
    });
  };

  // Potvrdzovaci dialog brani nechcenemu zmazaniu vozidla.
  const DeleteConfirmDialog = ({ vin, onConfirm, onCancel }) => (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Delete Vehicle</h3>
        <p>
          Are you sure you want to delete vehicle <strong>{vin}</strong>?
        </p>
        <p className="warning-text">
          This will remove the vehicle from your list. Historical data already
          linked in the system may remain available where applicable.
        </p>
        <div className="modal-actions">
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={deletingVin === vin}
            type="button"
          >
            Cancel
          </button>
          <button
            className="btn btn-danger"
            onClick={() => onConfirm(vin)}
            disabled={deletingVin === vin}
            type="button"
          >
            {deletingVin === vin ? "Deleting..." : "Delete Vehicle"}
          </button>
        </div>
      </div>
    </div>
  );

  // Pri nacitani sa zobrazi loading namiesto prazdnej tabulky.
  if (loading) {
    return (
      <div className="devices-container">
        <div className="loading-center">
          <div className="spinner-large"></div>
          <p>Loading vehicle statistics...</p>
        </div>
      </div>
    );
  }

  // Zoradeny zoznam sa pocita tesne pred renderom.
  const sortedVehicles = getSortedVehicles();

  return (
    <div className="devices-container">
      <div className="devices-header">
        <div className="header-content">
          <h1>{isAdmin ? "Vehicle Management" : "My Vehicles"}</h1>
          <p className="subtitle" style={{ marginTop: "0.5rem" }}>
            Vehicles linked through diagnostic devices
          </p>

          <div
            className="status-message info"
            style={{
              marginTop: "1rem",
              marginBottom: "1.5rem",
              alignItems: "flex-start",
            }}
          >
            <InformationCircleIcon
              style={{
                width: "1.1rem",
                height: "1.1rem",
                marginTop: "0.1rem",
                flexShrink: 0,
              }}
            />
            <div>
              A vehicle is added automatically after your diagnostic device is
              physically connected to it.
            </div>
          </div>
        </div>
      </div>

      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-number">{summary.totalVehicles}</span>
          <span className="stat-label">Total Vehicles</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{summary.onlineVehicles}</span>
          <span className="stat-label">Online</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">
            {summary.totalSamples.toLocaleString()}
          </span>
          <span className="stat-label">Total Samples</span>
        </div>
      </div>

      {statusMessage && (
        <div className="status-message success">
          <CheckCircleIcon
            style={{ width: "1.1rem", height: "1.1rem", flexShrink: 0 }}
          />
          <div>{statusMessage}</div>
        </div>
      )}

      {error && (
        <div className="error-message card">
          <ExclamationTriangleIcon
            className="error-icon"
            style={{ width: "1.5rem", height: "1.5rem" }}
          />
          <p>{error}</p>
        </div>
      )}

      <div className="devices-table-container card vehicles-table-container">
        <div className="table-header">
          <div>
            <h3>Vehicles ({sortedVehicles.length})</h3>
            <p className="table-info" style={{ marginTop: "0.35rem" }}>
              Diagnostics and Live Data require an active linked device.
            </p>
          </div>
        </div>

        {sortedVehicles.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <TruckIcon style={{ width: "3rem", height: "3rem", margin: "0 auto" }} />
            </div>
            <h3>No Vehicles Found</h3>
            <p>
              A vehicle appears automatically after your Raspberry Pi diagnostic
              device is connected to a car.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table
              className={`devices-table vehicles-telemetry-table ${
                isAdmin
                  ? "vehicles-telemetry-table-admin"
                  : "vehicles-telemetry-table-user"
              }`}
            >
              <thead>
                <tr>
                  <th className="status-column" onClick={() => handleSort("online")}>
                    <span className="sortable-header">
                      Status {getSortIcon("online")}
                    </span>
                  </th>

                  {isAdmin && (
                    <th
                      className="user-id-column"
                      onClick={() => handleSort("user_id")}
                    >
                      <span className="sortable-header">
                        User ID {getSortIcon("user_id")}
                      </span>
                    </th>
                  )}

                  <th onClick={() => handleSort("vin")}>
                    <span className="sortable-header">
                      Vehicle {getSortIcon("vin")}
                    </span>
                  </th>

                  <th onClick={() => handleSort("avg_speed")}>
                    <span className="sortable-header">
                      Avg Speed {getSortIcon("avg_speed")}
                    </span>
                  </th>

                  <th onClick={() => handleSort("avg_rpm")}>
                    <span className="sortable-header">
                      Avg RPM {getSortIcon("avg_rpm")}
                    </span>
                  </th>

                  <th onClick={() => handleSort("avg_consumption")}>
                    <span className="sortable-header">
                      Avg Cons. {getSortIcon("avg_consumption")}
                    </span>
                  </th>

                  <th>Range (RPM)</th>
                  <th>Odometer</th>

                  <th className="samples-column" onClick={() => handleSort("samples")}>
                    <span className="sortable-header">
                      Samples {getSortIcon("samples")}
                    </span>
                  </th>

                  <th className="actions-column">Actions</th>
                </tr>
              </thead>

              <tbody>
                {sortedVehicles.map((vehicle) => (
                  <tr key={vehicle.vin} className="device-row">
                    <td className="status-cell">
                      <span
                        className={`status-badge ${getStatusColor(vehicle.online)}`}
                      >
                        <span className="status-dot"></span>
                        {vehicle.online ? "Online" : "Offline"}
                      </span>
                    </td>

                    {isAdmin && (
                      <td className="user-id-cell">
                        {vehicle.user_id ? (
                          <span className="user-id-badge">{vehicle.user_id}</span>
                        ) : (
                          <span className="unassigned">—</span>
                        )}
                      </td>
                    )}

                    <td className="vehicle-cell">
                      <div className="vehicle-info">
                        <div className="vehicle-name">
                          {vehicle.brand || "Unknown"} {vehicle.model || ""}
                        </div>
                        <div className="vehicle-vin">
                          <code className="vin-code">{vehicle.vin || "No VIN"}</code>
                        </div>
                      </div>
                    </td>

                    <td className="metric-cell">
                      {vehicle.statistics?.avg_speed !== null &&
                      vehicle.statistics?.avg_speed !== undefined ? (
                        <span>{formatNumber(vehicle.statistics.avg_speed)} km/h</span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="metric-cell">
                      {vehicle.statistics?.avg_rpm !== null &&
                      vehicle.statistics?.avg_rpm !== undefined ? (
                        <span>{formatNumber(vehicle.statistics.avg_rpm)} rpm</span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="metric-cell">
                      {vehicle.statistics?.avg_consumption !== null &&
                      vehicle.statistics?.avg_consumption !== undefined ? (
                        <span>
                          {formatNumber(vehicle.statistics.avg_consumption)} L/100km
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="metric-cell">
                      {vehicle.statistics?.min_rpm !== null &&
                      vehicle.statistics?.min_rpm !== undefined &&
                      vehicle.statistics?.max_rpm !== null &&
                      vehicle.statistics?.max_rpm !== undefined ? (
                        <span>
                          {vehicle.statistics.min_rpm} - {vehicle.statistics.max_rpm}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="metric-cell">
                      {vehicle.statistics?.total_odometer !== null &&
                      vehicle.statistics?.total_odometer !== undefined ? (
                        <span>
                          {(vehicle.statistics.total_odometer / 1000).toFixed(1)}k km
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="samples-cell">
                      {vehicle.statistics?.samples ? (
                        <span className="samples-badge">
                          {vehicle.statistics.samples}
                        </span>
                      ) : (
                        "0"
                      )}
                    </td>

                    <td className="actions-cell">
                      <div className="actions-menu-wrapper">
                        <button
                          ref={(el) => {
                            triggerRefs.current[vehicle.vin] = el;
                          }}
                          className="btn-action-trigger"
                          type="button"
                          onClick={() => toggleActionMenu(vehicle.vin)}
                          disabled={deletingVin === vehicle.vin}
                        >
                          <EllipsisVerticalIcon
                            style={{ width: "0.95rem", height: "0.95rem" }}
                          />
                          Open
                        </button>

                        {openActionMenuVin === vehicle.vin && (
                          <div
                            className="actions-popup actions-popup-floating"
                            style={actionPopupStyle}
                            ref={actionMenuRef}
                          >
                            {vehicle.device_id ? (
                              <>
                                <button
                                  className="actions-popup-item"
                                  onClick={() => {
                                    setOpenActionMenuVin(null);
                                    onNavigate("device-diagnostics", {
                                      deviceId: vehicle.device_id,
                                    });
                                  }}
                                  type="button"
                                >
                                  <WrenchScrewdriverIcon
                                    style={{ width: "1rem", height: "1rem" }}
                                  />
                                  Diagnostics
                                </button>

                                <button
                                  className="actions-popup-item"
                                  onClick={() => {
                                    setOpenActionMenuVin(null);
                                    onNavigate("live-data", {
                                      type: "live",
                                      deviceId: vehicle.device_id,
                                      deviceInfo: {
                                        device_id: vehicle.device_id,
                                        vin: vehicle.vin,
                                        brand: vehicle.brand,
                                        model: vehicle.model,
                                      },
                                    });
                                  }}
                                  type="button"
                                >
                                  <ChartBarIcon
                                    style={{ width: "1rem", height: "1rem" }}
                                  />
                                  Live Data
                                </button>
                              </>
                            ) : (
                              <div className="actions-popup-empty">
                                Diagnostics and Live Data require a linked diagnostic
                                device.
                              </div>
                            )}

                            <button
                              className="actions-popup-item"
                              onClick={() => {
                                setOpenActionMenuVin(null);
                                onNavigate("vehicle-odometer", {
                                  vin: vehicle.vin,
                                  vehicleInfo: {
                                    vin: vehicle.vin,
                                    brand: vehicle.brand,
                                    model: vehicle.model,
                                    year: vehicle.year,
                                    engine: vehicle.engine,
                                    device_id: vehicle.device_id,
                                  },
                                });
                              }}
                              type="button"
                            >
                              <PencilSquareIcon
                                style={{ width: "1rem", height: "1rem" }}
                              />
                              Odometer
                            </button>

                            <button
                              className="actions-popup-item"
                              onClick={() => {
                                setOpenActionMenuVin(null);
                                onNavigate("vehicle-trips", {
                                  vin: vehicle.vin,
                                  vehicleInfo: {
                                    vin: vehicle.vin,
                                    brand: vehicle.brand,
                                    model: vehicle.model,
                                    year: vehicle.year,
                                  },
                                });
                              }}
                              type="button"
                            >
                              <MapIcon style={{ width: "1rem", height: "1rem" }} />
                              Trips
                            </button>

                            <button
                              className="actions-popup-item"
                              onClick={() => {
                                setOpenActionMenuVin(null);
                                onNavigate("vehicle-events", {
                                  vin: vehicle.vin,
                                  vehicleInfo: {
                                    vin: vehicle.vin,
                                    brand: vehicle.brand,
                                    model: vehicle.model,
                                    year: vehicle.year,
                                  },
                                });
                              }}
                              type="button"
                            >
                              <ShieldExclamationIcon
                                style={{ width: "1rem", height: "1rem" }}
                              />
                              Events
                            </button>

                            <button
                              className="actions-popup-item danger"
                              onClick={() => {
                                setOpenActionMenuVin(null);
                                setShowDeleteConfirmVin(vehicle.vin);
                              }}
                              disabled={deletingVin === vehicle.vin}
                              type="button"
                            >
                              <TrashIcon style={{ width: "1rem", height: "1rem" }} />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showDeleteConfirmVin && (
        <DeleteConfirmDialog
          vin={showDeleteConfirmVin}
          onConfirm={handleDeleteVehicle}
          onCancel={() => setShowDeleteConfirmVin(null)}
        />
      )}
    </div>
  );
}

export default VehicleTelemetryComparison;
