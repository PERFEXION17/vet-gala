document.addEventListener("DOMContentLoaded", () => {
  // --- STATE VARIABLES ---
  let currentTotalAmount = 0;
  let seatsAvailable = 200;

  // --- DOM ELEMENTS: Form & Inputs ---
  const form = document.getElementById("bookingForm");
  const nameInput = document.getElementById("fullName");
  const emailInput = document.getElementById("email");
  const phoneInput = document.getElementById("phoneNumber");

  const statusRadios = document.querySelectorAll('input[name="ticketStatus"]');
  const magazineCheckbox = document.getElementById("magazineToggle");

  const displayTotal = document.getElementById("displayTotal");
  const payButton = document.getElementById("payButton");
  const seatCounter = document.getElementById("seat-no");

  // --- DOM ELEMENTS: Summary Breakdown ---
  const displayStatusName = document.getElementById("displayStatusName");
  const displayStatusPrice = document.getElementById("displayStatusPrice");
  const displayMagDesc = document.getElementById("displayMagDesc");
  const displayMagPrice = document.getElementById("displayMagPrice");

  // --- DOM ELEMENTS: Ticket Preview ---
  const previewName = document.getElementById("previewName");
  const previewStatus = document.getElementById("previewStatus");
  const previewMag = document.getElementById("previewMag");

  // --- DOM ELEMENTS: Modals ---
  const modalOverlay = document.getElementById("paymentModal");
  const successModal = document.getElementById("successModal");
  const failModal = document.getElementById("failModal");
  const successTxId = document.getElementById("successTxId");
  const successTicketNo = document.getElementById("successTicketNo");

  // --- HELPER FUNCTIONS ---
  const formatNaira = (amount) => `₦ ${amount.toFixed(2)}`;

  // Generate a random ticket number (e.g., VG-84729)
  const generateTicketNumber = () => {
    return "VG-" + Math.floor(10000 + Math.random() * 90000);
  };

  // --- CORE UI & CALCULATION LOGIC ---
  const updateTicketOverview = () => {
    // 1. Determine selected status
    const selectedStatus = document.querySelector(
      'input[name="ticketStatus"]:checked',
    );
    let statusPrice = 0;
    let statusName = "Student";

    if (selectedStatus) {
      statusPrice = parseFloat(selectedStatus.value) || 0;
      statusName = selectedStatus.getAttribute("data-name") || "Student";
    }

    // 2. Determine magazine status
    const isMagSelected = magazineCheckbox && magazineCheckbox.checked;
    const magazinePrice = isMagSelected
      ? parseFloat(magazineCheckbox.value)
      : 0;

    // 3. Calculate Total
    currentTotalAmount = statusPrice + magazinePrice;

    // --- UPDATE DOM ELEMENTS SAFELY ---

    // Update Summary Section
    if (displayStatusName) displayStatusName.textContent = statusName;
    if (displayStatusPrice)
      displayStatusPrice.textContent = formatNaira(statusPrice);

    if (isMagSelected) {
      if (displayMagDesc) displayMagDesc.textContent = "Included";
      if (displayMagPrice)
        displayMagPrice.textContent = formatNaira(magazinePrice);
      if (previewMag) previewMag.textContent = "w/ Magazine";
    } else {
      if (displayMagDesc) displayMagDesc.textContent = "Not Selected";
      if (displayMagPrice) displayMagPrice.textContent = formatNaira(0);
      if (previewMag) previewMag.textContent = "No Magazine";
    }

    if (displayTotal)
      displayTotal.textContent = formatNaira(currentTotalAmount);

    // Update Ticket Preview
    if (previewStatus) previewStatus.textContent = statusName;

    // Update Pay Button
    if (payButton) {
      payButton.innerHTML = `<i class="ph-thin ph-lock-key"></i> PAY ${formatNaira(currentTotalAmount)}`;
    }
  };

  // --- MODAL CONTROLS ---
  window.closeModal = () => {
    modalOverlay.classList.remove("active");
    setTimeout(() => {
      successModal.style.display = "none";
      failModal.style.display = "none";
    }, 300); // Wait for fade out
  };

  const showModal = (type, txId = null, ticketNo = null) => {
    successModal.style.display = type === "success" ? "block" : "none";
    failModal.style.display = type === "fail" ? "block" : "none";

    if (type === "success") {
      successTxId.textContent = txId;
      successTicketNo.textContent = ticketNo;
    }

    modalOverlay.classList.add("active");
  };

  // --- PAYSTACK INTEGRATION ---
  const initializePayment = (e) => {
    e.preventDefault();

    // 1. Basic Form Validation
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (seatsAvailable <= 0) {
      alert("We are sorry, all seats are currently sold out.");
      return;
    }

    // 2. Gather Data for Paystack
    const selectedStatus = document
      .querySelector('input[name="ticketStatus"]:checked')
      .getAttribute("data-name");
    const hasMagazine = magazineCheckbox.checked ? "Yes" : "No";
    const generatedTicketNumber = generateTicketNumber();

    // 3. Setup Paystack Pop
    let handler = PaystackPop.setup({
      key: "pk_test_d20590ef86fe4669a36f97288826af15ca69c90b",
      email: emailInput.value.trim(),
      amount: currentTotalAmount * 100, // Paystack requires amount in kobo
      currency: "NGN",

      // Metadata allows you to pass custom fields that the admin will see in their Paystack Dashboard/Email
      metadata: {
        custom_fields: [
          {
            display_name: "Full Name",
            variable_name: "full_name",
            value: nameInput.value.trim(),
          },
          {
            display_name: "Phone Number",
            variable_name: "phone_number",
            value: phoneInput.value.trim(),
          },
          {
            display_name: "Ticket Type",
            variable_name: "ticket_type",
            value: selectedStatus,
          },
          {
            display_name: "Magazine Requested",
            variable_name: "magazine",
            value: hasMagazine,
          },
          {
            display_name: "Ticket Number",
            variable_name: "ticket_number",
            value: generatedTicketNumber,
          },
        ],
      },
      callback: function (response) {
        // Handle Success
        const reference = response.reference;

        // Decrement Seat Counter
        seatsAvailable--;
        if (seatCounter) seatCounter.textContent = seatsAvailable;

        // Show Success Modal
        showModal("success", reference, generatedTicketNumber);

        // Reset form after success and recalculate display
        form.reset();
        updateTicketOverview();
      },
      onClose: function () {
        // Handle Cancel/Failure
        showModal("fail");
      },
    });

    // 4. Open Paystack Iframe
    handler.openIframe();
  };

  // --- EVENT LISTENERS ---

  // Listen for radio button changes
  if (statusRadios.length > 0) {
    statusRadios.forEach((radio) =>
      radio.addEventListener("change", updateTicketOverview),
    );
  }

  // Listen for magazine toggle
  if (magazineCheckbox) {
    magazineCheckbox.addEventListener("change", updateTicketOverview);
  }

  // Live typing for the ticket preview name
  if (nameInput) {
    nameInput.addEventListener("input", (e) => {
      const val = e.target.value.trim();
      if (previewName) {
        previewName.textContent = val === "" ? "Your Name" : val;
      }
    });
  }

  // Handle Pay button click
  if (payButton) {
    payButton.addEventListener("click", initializePayment);
  }

  // Initial UI Setup on page load
  updateTicketOverview();
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
      }
    });
  },
  {
    threshold: 0.15,
  },
);

document.querySelectorAll(".fade-up").forEach((el) => {
  observer.observe(el);
});
