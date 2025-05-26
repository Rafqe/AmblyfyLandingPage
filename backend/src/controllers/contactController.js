const Contact = require("../models/Contact");

exports.submitContact = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Save to database
    const contact = new Contact({
      name,
      email,
      message,
    });
    await contact.save();

    res.status(201).json({
      success: true,
      message: "Contact form submitted successfully",
      data: contact,
    });
  } catch (error) {
    console.error("Error submitting contact form:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting contact form",
      error: error.message,
    });
  }
};
