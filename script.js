/* =========================================================
   GSAP
========================================================= */

gsap.registerPlugin(ScrollTrigger);

/* HERO SCROLL */

gsap.timeline({
    scrollTrigger:{trigger:".hero",start:"top top",end:"bottom top",scrub:1}
})
.to(".hero-grid",{scale:2,rotation:5,opacity:0})
.to(".hero-content",{y:-350,opacity:0,scale:.75},0)
.to(".hero-photo",{scale:1.3,rotation:-8,x:-100,opacity:.15},0)
.to(".hero-side",{x:250,opacity:0},0);


/* ABOUT */

gsap.from(".about-title",{
    y:180,opacity:0,scale:.85,duration:1.3,ease:"power4.out",
    scrollTrigger:{trigger:".about",start:"top 70%"}
});

gsap.from(".about-photo",{
    y:180,rotation:20,opacity:0,duration:1.2,
    scrollTrigger:{trigger:".about",start:"top 60%"}
});

gsap.from(".about-text",{
    y:100,opacity:0,
    scrollTrigger:{trigger:".about",start:"top 45%"}
});


/* STORY */

const storyTimeline = gsap.timeline({
    scrollTrigger:{trigger:".story",start:"top top",end:"bottom bottom",scrub:1}
});

storyTimeline
.to("#storyBackground",{scale:1.8,rotation:8,x:"-10vw"})
.to(".story-photo",{scale:1.35,rotation:8,x:"-15vw"},0)
.to(".story-title",{x:"35vw",scale:.65,opacity:0},0)
.to(".story-copy",{x:"-25vw",opacity:0},.2);


/* VALUES */

gsap.utils.toArray(".value").forEach((item,index)=>{
    gsap.from(item,{
        x:index % 2 === 0 ? -120 : 120,
        opacity:0,
        duration:1,
        scrollTrigger:{trigger:item,start:"top 85%"}
    });
});


/* SERVICES */

gsap.utils.toArray(".service").forEach((item,index)=>{
    gsap.from(item,{
        x:index % 2 === 0 ? -100 : 100,
        opacity:0,
        duration:.8,
        scrollTrigger:{trigger:item,start:"top 85%"}
    });
});


/* BOOKING ANIMATION */

gsap.from(".form-card",{
    x:-100,opacity:0,duration:1,
    scrollTrigger:{trigger:".booking",start:"top 70%"}
});

gsap.from(".map-wrapper",{
    x:100,opacity:0,duration:1,
    scrollTrigger:{trigger:".booking",start:"top 70%"}
});


/* =========================================================
   MAP VARIABLES
========================================================= */

let customerMap = null;
let customerMarker = null;
let ownerMap = null;
let ownerMarker = null;


/* CUSTOMER MAP INIT */

function initCustomerMap(){

    if(customerMap){return;}

    customerMap = L.map("customerMap",{zoomControl:true}).setView([14.17,121.24],13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
        attribution:"&copy; OpenStreetMap contributors",
        maxZoom:19
    }).addTo(customerMap);

    setTimeout(()=>{customerMap.invalidateSize();},300);
}

initCustomerMap();


/* =========================================================
   ADDRESS GEOCODING
========================================================= */

async function findAddressLocation(){

    const addressInput = document.getElementById("customerAddress");
    const address = addressInput.value.trim();

    if(!address){
        showToast("Please enter an address first.");
        addressInput.focus();
        return null;
    }

    const button = document.getElementById("findCustomerLocation");
    const status = document.getElementById("customerMapStatus");

    button.disabled = true;
    button.textContent = "SEARCHING...";
    status.textContent = "Searching the map for this address...";

    try{

        const params = new URLSearchParams({
            q:address,
            format:"json",
            addressdetails:"1",
            limit:"1"
        });

        const response = await fetch(
            "https://nominatim.openstreetmap.org/search?" + params.toString(),
            {method:"GET",headers:{"Accept":"application/json"}}
        );

        if(!response.ok){
            throw new Error("Map service error");
        }

        const results = await response.json();

        if(!Array.isArray(results) || results.length === 0){
            status.textContent = "Address was not found. Try adding barangay, municipality or province.";
            showToast("Address not found.");
            return null;
        }

        const result = results[0];
        const lat = Number(result.lat);
        const lng = Number(result.lon);

        if(!Number.isFinite(lat) || !Number.isFinite(lng)){
            throw new Error("Invalid coordinates");
        }

        addressInput.dataset.lat = lat;
        addressInput.dataset.lng = lng;
        addressInput.dataset.location = result.display_name;

        customerMap.invalidateSize();
        customerMap.flyTo([lat,lng],17,{duration:1.2});

        if(customerMarker){
            customerMap.removeLayer(customerMarker);
        }

        customerMarker = L.marker([lat,lng]).addTo(customerMap);

        customerMarker
            .bindPopup(`<strong>Appointment Location</strong><br>${escapeHTML(result.display_name)}`)
            .openPopup();

        status.textContent = "Location found: " + result.display_name;
        showToast("Map location found.");

        return {lat,lng,location:result.display_name};

    }
    catch(error){
        console.error("Address search error:",error);
        status.textContent = "Unable to search the map. Check your internet connection.";
        showToast("Map search failed.");
        return null;
    }
    finally{
        button.disabled = false;
        button.textContent = "FIND MAP";
    }
}

document.getElementById("findCustomerLocation").addEventListener("click",findAddressLocation);


/* =========================================================
   SERVICE PRICES
========================================================= */

const SERVICE_PRICES = {
    "Soft Glam":1200,
    "Full Glam":1800,
    "Bridal Makeup":3500,
    "Editorial Makeup":2500,
    "Makeup Consultation":500
};


/* =========================================================
   LOCAL STORAGE
========================================================= */

const STORAGE_KEY = "lumeaBookings";

function getBookings(){
    try{
        const data = localStorage.getItem(STORAGE_KEY);
        if(!data){return [];}
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch(error){
        console.error(error);
        return [];
    }
}

function saveBookings(bookings){
    localStorage.setItem(STORAGE_KEY,JSON.stringify(bookings));
}


/* =========================================================
   BOOKING FORM
========================================================= */

document.getElementById("bookingForm").addEventListener("submit",async event=>{

    event.preventDefault();

    const addressInput = document.getElementById("customerAddress");

    /* If user didn't click FIND MAP, try automatically. */
    if(!addressInput.dataset.lat || !addressInput.dataset.lng){

        const found = await findAddressLocation();

        if(!found){
            showToast("Please find your address on the map first.");
            return;
        }
    }

    const service = document.getElementById("bookingService").value;

    const booking = {
        id:Date.now(),
        name:document.getElementById("customerName").value.trim(),
        email:document.getElementById("customerEmail").value.trim(),
        phone:document.getElementById("customerPhone").value.trim(),
        service:service,
        date:document.getElementById("bookingDate").value,
        time:document.getElementById("bookingTime").value,
        address:addressInput.value.trim(),
        location:addressInput.dataset.location || addressInput.value.trim(),
        lat:addressInput.dataset.lat,
        lng:addressInput.dataset.lng,
        customerNotes:document.getElementById("customerNotes").value.trim(),
        ownerNotes:"",
        amount:SERVICE_PRICES[service] || 0,
        bookingStatus:"Pending",
        paymentStatus:"Unpaid",
        createdAt:new Date().toISOString()
    };

    const bookings = getBookings();
    bookings.push(booking);
    saveBookings(bookings);

    event.target.reset();

    addressInput.dataset.lat = "";
    addressInput.dataset.lng = "";
    addressInput.dataset.location = "";

    if(customerMarker){
        customerMap.removeLayer(customerMarker);
        customerMarker = null;
    }

    document.getElementById("customerMapStatus").textContent = "Appointment sent successfully.";

    showToast("Appointment request sent.");
});


/* DATE MIN */

document.getElementById("bookingDate").min = new Date().toISOString().split("T")[0];


/* =========================================================
   OPEN / CLOSE OWNER
========================================================= */

document.getElementById("openOwner").addEventListener("click",()=>{

    document.getElementById("ownerDashboard").classList.add("active");
    document.body.classList.add("owner-open");

    renderOwner();

    setTimeout(()=>{ScrollTrigger.refresh();},100);
});

document.getElementById("closeOwner").addEventListener("click",()=>{
    document.getElementById("ownerDashboard").classList.remove("active");
    document.body.classList.remove("owner-open");
});


/* =========================================================
   STATS
========================================================= */

function updateStats(){

    const bookings = getBookings();

    const paid = bookings
        .filter(b => b.paymentStatus === "Paid")
        .reduce((sum,b)=> sum + Number(b.amount || 0),0);

    const unpaid = bookings
        .filter(b => b.paymentStatus !== "Paid")
        .reduce((sum,b)=> sum + Number(b.amount || 0),0);

    document.getElementById("statTotal").textContent = bookings.length;
    document.getElementById("statPending").textContent = bookings.filter(b => b.bookingStatus === "Pending").length;
    document.getElementById("statConfirmed").textContent = bookings.filter(b => b.bookingStatus === "Confirmed").length;
    document.getElementById("statCompleted").textContent = bookings.filter(b => b.bookingStatus === "Completed").length;
    document.getElementById("statPaid").textContent = money(paid);
    document.getElementById("statUnpaid").textContent = money(unpaid);
}


/* =========================================================
   RENDER OWNER
========================================================= */

function renderOwner(){

    updateStats();

    const search = document.getElementById("bookingSearch").value.toLowerCase().trim();

    let bookings = getBookings();

    if(search){
        bookings = bookings.filter(booking=>{
            const searchable = [
                booking.name,
                booking.email,
                booking.phone,
                booking.service,
                booking.address,
                booking.bookingStatus,
                booking.paymentStatus
            ].join(" ").toLowerCase();

            return searchable.includes(search);
        });
    }

    bookings.sort((a,b)=> Number(b.id) - Number(a.id));

    const tbody = document.getElementById("bookingTableBody");

    if(!bookings.length){
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;padding:70px;color:#999;">
                    No customer bookings yet.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = bookings.map(booking=>`

        <tr>
            <td>
                <div class="customer-name">${escapeHTML(booking.name)}</div>
                <span class="customer-email">${escapeHTML(booking.email)}</span>
            </td>

            <td>${escapeHTML(booking.service)}</td>

            <td>
                ${formatDate(booking.date)}
                <br>
                ${escapeHTML(booking.time)}
            </td>

            <td><strong>${money(booking.amount)}</strong></td>

            <td>
                <span class="badge ${bookingStatusClass(booking.bookingStatus)}">
                    ${escapeHTML(booking.bookingStatus)}
                </span>
            </td>

            <td>
                <span class="badge ${paymentStatusClass(booking.paymentStatus)}">
                    ${escapeHTML(booking.paymentStatus)}
                </span>
            </td>

            <td>
                <button type="button" class="view-details" onclick="viewBooking(${booking.id})">
                    VIEW DETAILS
                </button>
            </td>
        </tr>

    `).join("");
}


/* =========================================================
   VIEW BOOKING DETAILS
========================================================= */

function viewBooking(id){

    const booking = getBookings().find(b => Number(b.id) === Number(id));

    if(!booking){return;}

    const container = document.getElementById("detailsContainer");

    container.innerHTML = `

        <div class="details-header">
            <div>
                <div class="details-name">${escapeHTML(booking.name)}</div>
            </div>

            <span class="badge ${bookingStatusClass(booking.bookingStatus)}">
                ${escapeHTML(booking.bookingStatus)}
            </span>
        </div>

        <div class="detail-section">
            <div class="detail-label">SERVICE</div>
            <div class="detail-value">${escapeHTML(booking.service)}</div>
        </div>

        <div class="detail-section">
            <div class="detail-label">APPOINTMENT</div>
            <div class="detail-value">
                ${formatDate(booking.date)} at ${escapeHTML(booking.time)}
            </div>
        </div>

        <div class="detail-section">
            <div class="detail-label">CUSTOMER CONTACT</div>
            <div class="detail-value">
                ${escapeHTML(booking.email)}
                <br>
                ${escapeHTML(booking.phone)}
            </div>
        </div>

        <div class="detail-section">
            <div class="detail-label">ADDRESS</div>
            <div class="detail-value">${escapeHTML(booking.address)}</div>
        </div>

        <div class="detail-section">
            <div class="detail-label">CUSTOMER NOTES</div>
            <div class="detail-note">
                ${booking.customerNotes ? escapeHTML(booking.customerNotes) : "No customer notes."}
            </div>
        </div>

        <div class="detail-section">
            <div class="detail-label">PAYMENT</div>

            <div class="payment-box">
                <div class="amount">${money(booking.amount)}</div>

                <select id="paymentSelect" class="payment-select">
                    <option value="Unpaid" ${booking.paymentStatus === "Unpaid" ? "selected" : ""}>Pending / Unpaid</option>
                    <option value="Partial" ${booking.paymentStatus === "Partial" ? "selected" : ""}>Partial Payment</option>
                    <option value="Paid" ${booking.paymentStatus === "Paid" ? "selected" : ""}>Paid</option>
                </select>

                <button type="button" class="save-payment" onclick="updatePayment(${booking.id})">
                    SAVE PAYMENT STATUS
                </button>
            </div>
        </div>

        <div class="detail-section">
            <div class="detail-label">CUSTOMER LOCATION</div>

            <div class="owner-map">
                <div id="ownerMapContainer" class="owner-map-inner"></div>

                ${
                    booking.lat && booking.lng
                    ? ""
                    : `<div class="owner-no-location">No map coordinates were saved for this booking.</div>`
                }
            </div>
        </div>

        <div class="detail-section">
            <div class="detail-label">PRIVATE OWNER NOTES</div>

            <textarea id="ownerNote" class="owner-note" placeholder="Private notes...">${escapeHTML(booking.ownerNotes || "")}</textarea>

            <button type="button" class="save-note" onclick="saveOwnerNote(${booking.id})">
                SAVE OWNER NOTES
            </button>
        </div>

        <div class="status-actions">
            <button type="button" class="action-confirm" onclick="updateBookingStatus(${booking.id},'Confirmed')">CONFIRM</button>
            <button type="button" class="action-complete" onclick="updateBookingStatus(${booking.id},'Completed')">COMPLETED</button>
            <button type="button" class="action-cancel" onclick="updateBookingStatus(${booking.id},'Cancelled')">CANCEL</button>
            <button type="button" class="action-delete" onclick="deleteBooking(${booking.id})">DELETE</button>
        </div>

    `;

    /* Owner map is initialized only after #ownerMapContainer exists. */
    setTimeout(()=>{initOwnerMap(booking);},100);
}


/* =========================================================
   OWNER MAP INITIALIZATION
========================================================= */

function initOwnerMap(booking){

    const container = document.getElementById("ownerMapContainer");

    if(!container){return;}

    if(ownerMap){
        ownerMap.remove();
        ownerMap = null;
        ownerMarker = null;
    }

    ownerMap = L.map(container,{zoomControl:true}).setView([14.17,121.24],13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
        attribution:"&copy; OpenStreetMap contributors",
        maxZoom:19
    }).addTo(ownerMap);

    setTimeout(()=>{ownerMap.invalidateSize();},200);

    if(booking.lat && booking.lng){

        const lat = Number(booking.lat);
        const lng = Number(booking.lng);

        if(Number.isFinite(lat) && Number.isFinite(lng)){

            ownerMap.flyTo([lat,lng],17,{duration:1});

            ownerMarker = L.marker([lat,lng]).addTo(ownerMap);

            ownerMarker
                .bindPopup(`<strong>Customer Location</strong><br>${escapeHTML(booking.address)}`)
                .openPopup();
        }
    }
}


/* =========================================================
   UPDATE BOOKING STATUS
========================================================= */

function updateBookingStatus(id,status){

    const bookings = getBookings();
    const booking = bookings.find(b => Number(b.id) === Number(id));

    if(!booking){return;}

    booking.bookingStatus = status;

    saveBookings(bookings);
    renderOwner();
    viewBooking(id);
    showToast("Booking status updated.");
}


/* PAYMENT */

function updatePayment(id){

    const select = document.getElementById("paymentSelect");

    if(!select){return;}

    const bookings = getBookings();
    const booking = bookings.find(b => Number(b.id) === Number(id));

    if(!booking){return;}

    booking.paymentStatus = select.value;

    saveBookings(bookings);
    renderOwner();
    viewBooking(id);
    showToast("Payment status updated.");
}


/* OWNER NOTES */

function saveOwnerNote(id){

    const input = document.getElementById("ownerNote");

    if(!input){return;}

    const bookings = getBookings();
    const booking = bookings.find(b => Number(b.id) === Number(id));

    if(!booking){return;}

    booking.ownerNotes = input.value;

    saveBookings(bookings);
    showToast("Owner notes saved.");
}


/* DELETE */

function deleteBooking(id){

    const confirmed = confirm("Delete this booking permanently?");

    if(!confirmed){return;}

    let bookings = getBookings();

    bookings = bookings.filter(b => Number(b.id) !== Number(id));

    saveBookings(bookings);

    document.getElementById("detailsContainer").innerHTML =
        `<div class="details-empty">Booking deleted.</div>`;

    renderOwner();
    showToast("Booking deleted.");
}


/* SEARCH */

document.getElementById("bookingSearch").addEventListener("input",renderOwner);


/* =========================================================
   EXCEL EXPORT
========================================================= */

document.getElementById("exportExcel").addEventListener("click",()=>{

    const bookings = getBookings();

    if(!bookings.length){
        showToast("No bookings to export.");
        return;
    }

    const excelData = bookings.map(booking=>({
        "Booking ID":booking.id,
        "Customer Name":booking.name,
        "Email":booking.email,
        "Phone":booking.phone,
        "Service":booking.service,
        "Appointment Date":booking.date,
        "Appointment Time":booking.time,
        "Address":booking.address,
        "Location":booking.location,
        "Latitude":booking.lat,
        "Longitude":booking.lng,
        "Amount":booking.amount,
        "Booking Status":booking.bookingStatus,
        "Payment Status":booking.paymentStatus,
        "Customer Notes":booking.customerNotes,
        "Owner Notes":booking.ownerNotes,
        "Created At":booking.createdAt
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);

    /* Readable Excel column widths. */
    worksheet["!cols"] = [
        {wch:15},{wch:25},{wch:30},{wch:18},{wch:25},{wch:18},{wch:18},{wch:40},{wch:40},
        {wch:14},{wch:14},{wch:14},{wch:18},{wch:18},{wch:40},{wch:40},{wch:25}
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook,worksheet,"Bookings");

    const filename = "Lumea_Bookings_" + new Date().toISOString().slice(0,10) + ".xlsx";

    XLSX.writeFile(workbook,filename);

    showToast("Excel file exported.");
});


/* =========================================================
   HELPERS
========================================================= */

function money(amount){
    return "₱" + Number(amount || 0).toLocaleString("en-PH");
}

function formatDate(date){

    if(!date){return "";}

    const parsed = new Date(date + "T00:00:00");

    if(Number.isNaN(parsed.getTime())){
        return date;
    }

    return parsed.toLocaleDateString("en-PH",{month:"short",day:"numeric",year:"numeric"});
}

function bookingStatusClass(status){
    return {
        Pending:"badge-pending",
        Confirmed:"badge-confirmed",
        Completed:"badge-completed",
        Cancelled:"badge-cancelled"
    }[status] || "badge-pending";
}

function paymentStatusClass(status){
    return {
        Unpaid:"badge-unpaid",
        Partial:"badge-partial",
        Paid:"badge-paid"
    }[status] || "badge-unpaid";
}


/* SECURITY */

function escapeHTML(value){
    return String(value ?? "").replace(/[&<>"']/g,character=>({
        "&":"&amp;",
        "<":"&lt;",
        ">":"&gt;",
        '"':"&quot;",
        "'":"&#039;"
    })[character]);
}


/* TOAST */

function showToast(message){

    const toast = document.getElementById("toast");

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(window.toastTimer);

    window.toastTimer = setTimeout(()=>{
        toast.classList.remove("show");
    },2500);
}


/* RESIZE MAP */

window.addEventListener("resize",()=>{
    if(customerMap){customerMap.invalidateSize();}
    if(ownerMap){ownerMap.invalidateSize();}
});


/* INITIAL REFRESH */

window.addEventListener("load",()=>{
    setTimeout(()=>{
        ScrollTrigger.refresh();
        if(customerMap){customerMap.invalidateSize();}
    },700);
});


(function () {

    if (!window.THREE) {
        console.warn("Three.js failed to load. Collection gallery skipped.");
        return;
    }

    /* =====================================================
       YOUR COLLECTION — EDIT THESE PICTURES
       Replace each src with your own photo URL or a file
       path such as "images/bridal.jpg".
    ===================================================== */

    const ITEMS = [
        {
            title: "Full Glam",
            note: "Defined eyes, sculpted skin, made to be photographed.",
            src: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1000&q=85"
        },
        {
            title: "Soft Glam",
            note: "A glowing, skin-first finish for everyday occasions.",
            src: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=1000&q=85"
        },
        {
            title: "Bridal Makeup",
            note: "Long-wearing and timeless, from the first look to the last dance.",
            src: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=1000&q=85"
        },
        {
            title: "Editorial Makeup",
            note: "Bold color and shape for shoots and creative work.",
            src: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1000&q=85"
        },
        {
            title: "The Palette",
            note: "The products and tools behind every LUMÉA look.",
            src: "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=1000&q=85"
        },
        {
            title: "In The Studio",
            note: "Where every appointment begins.",
            src: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1000&q=85"
        }
    ];

    const section = document.getElementById("collection");
    const canvas = document.getElementById("colCanvas");
    const pin = canvas.parentElement;

    const N = ITEMS.length;
    const STEP = (Math.PI * 2) / N;
    const RADIUS = 12;
    const ARC = STEP * 0.66;
    const HEIGHT = 11;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setClearColor(0x11100f, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 0, 0);

    const ring = new THREE.Group();
    scene.add(ring);


    /* ---------- fallback texture if a picture fails ---------- */

    function makeFallback(title) {
        const c = document.createElement("canvas");
        c.width = 600;
        c.height = 800;
        const g = c.getContext("2d");
        const grad = g.createLinearGradient(0, 0, 600, 800);
        grad.addColorStop(0, "#2a1f20");
        grad.addColorStop(0.55, "#a96872");
        grad.addColorStop(1, "#d3aa87");
        g.fillStyle = grad;
        g.fillRect(0, 0, 600, 800);
        g.fillStyle = "rgba(255,255,255,.9)";
        g.font = "56px Georgia, serif";
        g.textAlign = "center";
        g.fillText(title, 300, 420);
        const t = new THREE.CanvasTexture(c);
        t.encoding = THREE.sRGBEncoding;
        return t;
    }

    function setCover(tex, w, h) {
        const panelAspect = (RADIUS * ARC) / HEIGHT;
        const imgAspect = w / h;
        let kx = 1, ky = 1;
        if (imgAspect > panelAspect) {
            kx = panelAspect / imgAspect;
        } else {
            ky = imgAspect / panelAspect;
        }
        /* u is flipped because we look at the cylinder from inside */
        tex.repeat.set(-kx, ky);
        tex.offset.set(0.5 + kx / 2, (1 - ky) / 2);
    }


    /* ---------- panels ---------- */

    const placeholder = new THREE.DataTexture(
        new Uint8Array([36, 31, 30, 255]), 1, 1, THREE.RGBAFormat
    );
    placeholder.needsUpdate = true;

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");

    const panels = [];

    ITEMS.forEach((item, i) => {

        const geometry = new THREE.CylinderGeometry(
            RADIUS, RADIUS, HEIGHT, 56, 1, true, -ARC / 2, ARC
        );

        const material = new THREE.MeshBasicMaterial({
            map: placeholder,
            side: THREE.BackSide,
            color: 0xffffff
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.y = i * STEP;
        mesh.userData.index = i;
        ring.add(mesh);

        /* thin gold frame */
        const edges = new THREE.LineSegments(
            new THREE.EdgesGeometry(geometry),
            new THREE.LineBasicMaterial({
                color: 0xb99561,
                transparent: true,
                opacity: 0.55
            })
        );
        mesh.add(edges);

        panels.push({ mesh, material, edges, bright: 0.3, scale: 1 });

        loader.load(
            item.src,
            tex => {
                tex.encoding = THREE.sRGBEncoding;
                tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
                setCover(tex, tex.image.width, tex.image.height);
                material.map = tex;
                material.needsUpdate = true;
            },
            undefined,
            () => {
                material.map = makeFallback(item.title);
                material.needsUpdate = true;
            }
        );
    });


    /* ---------- gold rings (top + bottom) ---------- */

    function makeRing(y) {
        const pts = [];
        for (let a = 0; a <= 128; a++) {
            const t = (a / 128) * Math.PI * 2;
            pts.push(new THREE.Vector3(
                Math.sin(t) * (RADIUS - 0.05), y, Math.cos(t) * (RADIUS - 0.05)
            ));
        }
        return new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineBasicMaterial({
                color: 0xb99561,
                transparent: true,
                opacity: 0.35
            })
        );
    }

    scene.add(makeRing(HEIGHT / 2 + 0.8));
    scene.add(makeRing(-HEIGHT / 2 - 0.8));


    /* ---------- gold dust ---------- */

    const DUST = 900;
    const dustPos = new Float32Array(DUST * 3);

    for (let i = 0; i < DUST; i++) {
        const r = 3 + Math.random() * 8.5;
        const t = Math.random() * Math.PI * 2;
        dustPos[i * 3] = Math.sin(t) * r;
        dustPos[i * 3 + 1] = (Math.random() - 0.5) * 22;
        dustPos[i * 3 + 2] = Math.cos(t) * r;
    }

    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));

    const dust = new THREE.Points(
        dustGeo,
        new THREE.PointsMaterial({
            color: 0xd3aa87,
            size: 0.09,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })
    );
    scene.add(dust);


    /* =====================================================
       INTERACTION STATE
    ===================================================== */

    let progress = 0;      /* scroll 0 → 1        */
    let dragOffset = 0;    /* extra spin from drag */
    let current = 0;       /* smoothed rotation    */
    let velocity = 0;      /* scroll velocity      */
    let lastScrollY = window.scrollY;

    const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
    let hovered = -1;
    let activeIndex = -1;
    let visible = false;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const hud = document.getElementById("colHud");
    const countEl = document.getElementById("colCount");
    const nameEl = document.getElementById("colName");
    const noteEl = document.getElementById("colNote");
    const headEl = document.getElementById("colHead");
    const barEl = document.getElementById("colProgress");

    function pad(n) {
        return String(n).padStart(2, "0");
    }

    function setActive(index) {
        if (index === activeIndex) return;
        const first = activeIndex === -1;
        activeIndex = index;

        const apply = () => {
            countEl.textContent = pad(index + 1) + " / " + pad(N);
            nameEl.textContent = ITEMS[index].title;
            noteEl.textContent = ITEMS[index].note;
            hud.classList.remove("swap");
        };

        if (first) {
            apply();
        } else {
            hud.classList.add("swap");
            setTimeout(apply, 180);
        }
    }

    function scrollTotal() {
        return (N - 1) * STEP;
    }

    function readScroll() {
        const rect = section.getBoundingClientRect();
        const range = section.offsetHeight - window.innerHeight;
        progress = Math.min(1, Math.max(0, -rect.top / range));

        const y = window.scrollY;
        velocity = y - lastScrollY;
        lastScrollY = y;
    }

    window.addEventListener("scroll", readScroll, { passive: true });


    /* ---------- pointer: hover, drag, click ---------- */

    let dragging = false;
    let dragLastX = 0;
    let dragMoved = 0;

    function updatePointer(e) {
        const rect = canvas.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        mouse.x = pointer.x;
        mouse.y = pointer.y;
    }

    function pick() {
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(ring.children, false);
        return hits.length ? hits[0].object.userData.index : -1;
    }

    canvas.addEventListener("pointerdown", e => {
        dragging = true;
        dragLastX = e.clientX;
        dragMoved = 0;
        canvas.classList.add("grabbing");
        canvas.setPointerCapture(e.pointerId);
        updatePointer(e);
    });

    canvas.addEventListener("pointermove", e => {
        updatePointer(e);

        if (dragging) {
            const dx = e.clientX - dragLastX;
            dragLastX = e.clientX;
            dragMoved += Math.abs(dx);
            dragOffset -= dx * 0.006;
        } else {
            hovered = pick();
            canvas.classList.toggle("hovering", hovered !== -1);
        }
    });

    function endDrag(e) {
        if (!dragging) return;
        dragging = false;
        canvas.classList.remove("grabbing");

        updatePointer(e);

        if (dragMoved < 6) {
            const index = pick();
            if (index !== -1) openViewer(index);
        } else {
            /* snap to nearest look */
            const base = progress * scrollTotal();
            const total = base + dragOffset;
            dragOffset = Math.round(total / STEP) * STEP - base;
        }
    }

    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);

    canvas.addEventListener("pointerleave", () => {
        if (!dragging) {
            hovered = -1;
            canvas.classList.remove("hovering");
        }
    });


    /* ---------- viewer ---------- */

    const viewer = document.getElementById("colViewer");
    const viewerImg = document.getElementById("colViewerImg");
    const viewerCap = document.getElementById("colViewerCap");

    function openViewer(index) {
        const item = ITEMS[index];
        viewerImg.src = item.src;
        viewerImg.alt = item.title;
        viewerCap.innerHTML = "";
        viewerCap.append(item.title);
        const span = document.createElement("span");
        span.textContent = item.note;
        viewerCap.appendChild(span);
        viewer.classList.add("open");
    }

    function closeViewer() {
        viewer.classList.remove("open");
    }

    document.getElementById("colClose").addEventListener("click", closeViewer);
    viewer.addEventListener("click", e => {
        if (e.target === viewer) closeViewer();
    });
    document.addEventListener("keydown", e => {
        if (e.key === "Escape") closeViewer();
    });


    /* =====================================================
       RESIZE + RENDER LOOP
    ===================================================== */

    let baseFov = 60;

    function resize() {
        const w = pin.clientWidth;
        const h = pin.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        baseFov = camera.aspect < 0.8 ? 80 : camera.aspect < 1.2 ? 68 : 60;
        camera.fov = baseFov;
        camera.updateProjectionMatrix();
    }

    resize();
    window.addEventListener("resize", resize);

    new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
    }, { rootMargin: "100px" }).observe(section);

    function wrapAngle(a) {
        const twoPi = Math.PI * 2;
        return ((a + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
    }

    const clock = new THREE.Clock();
    let tilt = 0;
    let fovKick = 0;

    function frame() {
        requestAnimationFrame(frame);
        if (!visible) return;

        const time = clock.getElapsedTime();

        /* decay velocity between scroll events */
        velocity *= 0.88;

        /* smooth rotation */
        const target = progress * scrollTotal() + dragOffset;
        current += (target - current) * (reduceMotion ? 1 : 0.07);
        ring.rotation.y = -current;

        /* speed effects: roll + lens warp */
        if (!reduceMotion) {
            const v = Math.max(-80, Math.min(80, velocity));
            tilt += (v * 0.0016 - tilt) * 0.08;
            fovKick += (Math.abs(v) * 0.12 - fovKick) * 0.08;
        }
        ring.rotation.z = tilt;
        camera.fov = baseFov + fovKick;
        camera.updateProjectionMatrix();

        /* mouse parallax */
        mouse.sx += (mouse.x - mouse.sx) * 0.05;
        mouse.sy += (mouse.y - mouse.sy) * 0.05;
        camera.position.set(mouse.sx * 0.7, mouse.sy * 0.4, 0);
        camera.lookAt(mouse.sx * 2.2, mouse.sy * 1.4, 12);

        /* dust drifts against the ring */
        dust.rotation.y = current * 0.6 + time * 0.03;
        dust.position.y = Math.sin(time * 0.4) * 0.4;

        /* per-panel brightness + hover push */
        let nearest = 0;
        let nearestDiff = Infinity;

        panels.forEach((p, i) => {
            const diff = wrapAngle(i * STEP - current);
            const abs = Math.abs(diff);

            if (abs < nearestDiff) {
                nearestDiff = abs;
                nearest = i;
            }

            let bright = Math.max(0.2, 1 - abs * 0.62);
            if (i === hovered) bright = Math.min(1, bright + 0.15);

            p.bright += (bright - p.bright) * 0.12;
            p.material.color.setScalar(p.bright);
            p.edges.material.opacity = 0.2 + p.bright * 0.5;

            const s = i === hovered && !dragging ? 0.94 : 1;
            p.scale += (s - p.scale) * 0.1;
            p.mesh.scale.set(p.scale, 1 + (1 - p.scale) * 0.6, p.scale);
        });

        setActive(nearest);

        /* heading fades as the ring starts to turn */
        const fade = Math.max(0, 1 - progress * 7);
        headEl.style.opacity = fade;
        headEl.style.transform = "translateY(" + (-(1 - fade) * 40) + "px)";
        barEl.style.transform = "scaleY(" + progress + ")";

        renderer.render(scene, camera);
    }

    readScroll();
    setActive(0);
    frame();

    /* GSAP changes layout heights, so re-measure once after load */
    window.addEventListener("load", () => {
        setTimeout(() => {
            resize();
            readScroll();
            if (window.ScrollTrigger) ScrollTrigger.refresh();
        }, 800);
    });

})();