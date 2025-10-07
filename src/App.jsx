import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Cropper from "react-easy-crop";
import { motion, AnimatePresence } from "framer-motion";

// 🗺️ Nominatim (OpenStreetMap) autocomplete API
const fetchPlaceSuggestions = async (query) => {
  if (!query) return [];
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}`
  );
  const data = await res.json();
  return data.slice(0, 5);
};

// 🧍‍♂️ Create personalized photo + name marker
const createNameMarker = (entry) =>
  L.divIcon({
    className: "custom-icon",
    html: `
      <div style="text-align:center;position:relative;">
        <img 
          src="${entry.photo || "https://via.placeholder.com/50"}" 
          alt="${entry.name}" 
          style="
            width:40px;
            height:40px;
            object-fit:cover;
            border-radius:50%;
            border:2px solid #3b82f6;
            box-shadow:0 0 6px rgba(0,0,0,0.25);
          "
        />
        <div 
          style="
            font-size:11px;
            font-weight:500;
            margin-top:2px;
            color:#111;
            background:rgba(255,255,255,0.85);
            border-radius:5px;
            padding:1px 4px;
            display:inline-block;
          "
        >${entry.name}</div>
      </div>
    `,
    iconSize: [40, 50],
    iconAnchor: [20, 50],
  });

// Fix Leaflet icons (fallback for default pins)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function App() {
  const [entries, setEntries] = useState([]);
  const [view, setView] = useState("map");
  const [darkMode, setDarkMode] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const [form, setForm] = useState({
    name: "",
    birthName: "",
    from: "",
    now: "",
    message: "",
    photo: "",
    fromCoords: null,
    nowCoords: null,
  });

  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [nowSuggestions, setNowSuggestions] = useState([]);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [showCropper, setShowCropper] = useState(false);

  useEffect(() => {
    fetch("/entries.json")
      .then((res) => res.json())
      .then(setEntries)
      .catch(() => console.log("No entries yet"));
  }, []);

  // 📸 Handle photo upload
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  // 📍 Autocomplete search for "Adopted from"
  const handleFromChange = async (e) => {
    const query = e.target.value;
    setForm({ ...form, from: query });
    const results = await fetchPlaceSuggestions(query);
    setFromSuggestions(results);
  };

  // 📍 Autocomplete search for "Now living in"
  const handleNowChange = async (e) => {
    const query = e.target.value;
    setForm({ ...form, now: query });
    const results = await fetchPlaceSuggestions(query);
    setNowSuggestions(results);
  };

  // When user selects a place
  const selectPlace = (field, place) => {
    setForm({
      ...form,
      [field]: place.display_name,
      [`${field}Coords`]: [parseFloat(place.lat), parseFloat(place.lon)],
    });
    if (field === "from") setFromSuggestions([]);
    if (field === "now") setNowSuggestions([]);
  };

  // 📨 Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.photo) {
      alert("Please upload a photo of yourself before submitting.");
      return;
    }

    console.log("Submitted:", form);
    alert(
      "💙 Thank you for sharing your story!\nYour submission has been received and will appear on the global wall once approved."
    );

    setForm({
      name: "",
      birthName: "",
      from: "",
      now: "",
      message: "",
      photo: "",
      fromCoords: null,
      nowCoords: null,
    });
    setPhotoPreview(null);
  };

  const appTheme = darkMode
    ? "bg-gray-900 text-gray-100"
    : "bg-gray-50 text-gray-900";

  return (
    <div
      className={`flex flex-col items-center min-h-screen font-sans transition-colors duration-500 ${appTheme}`}
    >
      {/* Header */}
      <div className="flex justify-between items-center w-full max-w-5xl px-6 mt-6 mb-4">
        <h1 className="text-3xl font-bold text-brand-dark dark:text-brand-light">
          I’m Adopted Wall 🌍
        </h1>
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {darkMode ? "☀️ Light" : "🌙 Dark"}
        </button>
      </div>

      <p className="mb-6 text-center px-4 max-w-2xl text-gray-600 dark:text-gray-300">
        Write your name on our global wall and share what National Adoption
        Awareness Month means to you.
      </p>

      {/* View buttons */}
      <div className="flex gap-3 mb-6">
        {[
          { id: "map", label: "World Map" },
          { id: "wall", label: "Our Wall" },
          { id: "form", label: "Add Your Name" },
        ].map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`px-5 py-2.5 rounded-lg font-medium border transition-all duration-300 shadow-sm
            ${
              view === v.id
                ? "bg-blue-600 border-blue-600 text-white hover:bg-blue-700"
                : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* MAP VIEW */}
      {view === "map" && (
        <div className="w-full h-[80vh] max-w-5xl rounded-2xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 relative">
          <MapContainer
            center={[20, 0]}
            zoom={2}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {entries.map((e, i) => (
              <Marker key={i} position={[e.lat, e.lng]} icon={createNameMarker(e)}>
                <Popup>
                  <b>{e.name}</b> <br />
                  From: {e.from} <br />
                  Living in: {e.now} <br />
                  <i>“{e.message}”</i>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {/* WALL VIEW */}
      {view === "wall" && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4 max-w-5xl w-full">
            {entries.map((e, i) => (
              <div
                key={i}
                onClick={() => setSelectedEntry(e)}
                className="relative group overflow-hidden rounded-xl shadow-lg bg-white dark:bg-gray-800 cursor-pointer"
              >
                <img
                  src={e.photo || "https://via.placeholder.com/300"}
                  alt={e.name}
                  className="object-cover w-full h-48"
                />
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition">
                  <div className="text-white p-3 text-sm">
                    <b>{e.name}</b>
                    <p className="text-xs mt-1">
                      From {e.from} → Living in {e.now}
                    </p>
                    <i>
                      “
                      {e.message.length > 60
                        ? e.message.substring(0, 60) + "..."
                        : e.message}
                      ”
                    </i>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Modal */}
          <AnimatePresence>
            {selectedEntry && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm z-50 p-4"
                onClick={() => setSelectedEntry(null)}
              >
                <motion.div
                  onClick={(e) => e.stopPropagation()}
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.9 }}
                  className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-md w-full text-center shadow-xl"
                >
                  <img
                    src={
                      selectedEntry.photo || "https://via.placeholder.com/300"
                    }
                    alt={selectedEntry.name}
                    className="w-48 h-48 object-cover rounded-full mx-auto mb-4"
                  />
                  <h3 className="text-xl font-bold mb-2">
                    {selectedEntry.name}
                  </h3>
                  {selectedEntry.birthName && (
                    <p className="text-sm italic text-gray-500 mb-2">
                      Birth name: {selectedEntry.birthName}
                    </p>
                  )}
                  <p className="text-sm mb-1">
                    From {selectedEntry.from} → Living in {selectedEntry.now}
                  </p>
                  <p className="italic text-gray-700 dark:text-gray-300 mt-2">
                    “{selectedEntry.message}”
                  </p>
                  <button
                    onClick={() => setSelectedEntry(null)}
                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                  >
                    Close
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* FORM VIEW */}
      {view === "form" && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md mb-10 border border-gray-200 dark:border-gray-700"
        >
          <h2 className="text-2xl font-semibold text-center mb-6 text-brand-dark dark:text-brand-light">
            Share on the Wall
          </h2>

          <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
            Your Name
          </label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2 w-full rounded mb-3"
          />

          <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
            Your Birth Name (optional)
          </label>
          <input
            value={form.birthName}
            onChange={(e) => setForm({ ...form, birthName: e.target.value })}
            className="border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2 w-full rounded mb-3"
          />

          {/* Adopted from autocomplete */}
          <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
            Adopted from
          </label>
          <div className="relative mb-3">
            <input
              required
              value={form.from}
              onChange={handleFromChange}
              placeholder="Type a city or country..."
              className="border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2 w-full rounded"
            />
            {fromSuggestions.length > 0 && (
              <ul className="absolute z-50 bg-white dark:bg-gray-800 w-full rounded shadow-lg mt-1 max-h-48 overflow-y-auto">
                {fromSuggestions.map((s, i) => (
                  <li
                    key={i}
                    onClick={() => selectPlace("from", s)}
                    className="p-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {s.display_name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Now living in autocomplete */}
          <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
            Now living in
          </label>
          <div className="relative mb-3">
            <input
              required
              value={form.now}
              onChange={handleNowChange}
              placeholder="Type a city or country..."
              className="border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2 w-full rounded"
            />
            {nowSuggestions.length > 0 && (
              <ul className="absolute z-50 bg-white dark:bg-gray-800 w-full rounded shadow-lg mt-1 max-h-48 overflow-y-auto">
                {nowSuggestions.map((s, i) => (
                  <li
                    key={i}
                    onClick={() => selectPlace("now", s)}
                    className="p-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {s.display_name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
            What does National Adoption Awareness Month mean to you?
          </label>
          <textarea
            required
            maxLength="300"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2 w-full rounded mb-4 h-28 resize-none"
            placeholder="Write a few words about what this month means to you..."
          />

          {/* Photo upload and cropper */}
          <div className="mb-6">
            <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
              Please upload a photo of you (JPG)
            </label>
            <input type="file" accept="image/jpeg" onChange={handlePhotoUpload} />

            <AnimatePresence>
              {showCropper && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="relative mt-4 w-full h-64 bg-gray-100 rounded-lg overflow-hidden"
                >
                  <Cropper
                    image={photoPreview}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                  />
                  <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-3">
                    <button
                      type="button"
                      className="bg-brand text-white px-3 py-1 rounded"
                      onClick={() => {
                        setForm({ ...form, photo: photoPreview });
                        setShowCropper(false);
                      }}
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      className="bg-gray-200 text-gray-700 px-3 py-1 rounded"
                      onClick={() => {
                        setPhotoPreview(null);
                        setShowCropper(false);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {form.photo && !showCropper && (
              <img
                src={form.photo}
                alt="Preview"
                className="w-32 h-32 object-cover rounded mt-4 shadow-md"
              />
            )}
          </div>

          <button
            type="submit"
            className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-4 py-3 rounded w-full font-semibold text-lg shadow-md transition-all duration-300"
          >
            Share to the Wall 💙
          </button>
        </form>
      )}
    </div>
  );
}
