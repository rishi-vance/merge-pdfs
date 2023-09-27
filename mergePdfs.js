const fs = require("fs");
const path = require("path");
const { PDFDocument } = require("pdf-lib");
const fse = require("fs-extra");

// Function to check if a file is a PDF
function isPDF(file) {
  return path.extname(file).toLowerCase() === ".pdf";
}

// Function to convert images (JPG/PNG) to PDF
async function convertToPDF(imagePath) {
  const pdfDoc = await PDFDocument.create();

  // Determine the image type
  const ext = path.extname(imagePath).toLowerCase();
  const isPNG = ext === ".png";

  const imgBytes = await fse.readFile(imagePath);

  // Embed the image based on its format
  if (isPNG) {
    const img = await pdfDoc.embedPng(imgBytes);
    const page = pdfDoc.addPage([img.width, img.height]);
    page.drawImage(img, {
      x: 0,
      y: 0,
      width: img.width,
      height: img.height,
    });
  } else {
    const img = await pdfDoc.embedJpg(imgBytes);
    const page = pdfDoc.addPage([img.width, img.height]);
    page.drawImage(img, {
      x: 0,
      y: 0,
      width: img.width,
      height: img.height,
    });
  }

  return pdfDoc;
}

// Function to merge multiple PDFs into one PDF
async function mergePDFs(pdfDocs) {
  const mergedPDF = await PDFDocument.create();

  for (const pdfDoc of pdfDocs) {
    const copiedPages = await mergedPDF.copyPages(
      pdfDoc,
      pdfDoc.getPageIndices()
    );
    copiedPages.forEach((page) => mergedPDF.addPage(page));
  }

  return mergedPDF;
}

// Main function
async function main(inputFolder, outputFolder) {
  try {
    const files = await fse.readdir(inputFolder);
    const pdfDocs = [];

    for (const file of files) {
      const filePath = path.join(inputFolder, file);

      if (isPDF(filePath)) {
        const pdfBytes = await fse.readFile(filePath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        pdfDocs.push(pdfDoc);
      } else if (
        [".jpg", ".png", ".jpeg"].includes(path.extname(file).toLowerCase())
      ) {
        const pdfDoc = await convertToPDF(filePath);
        pdfDocs.push(pdfDoc);
      }
    }

    if (pdfDocs.length === 0) {
      console.log("No PDF or image files found in the input folder.");
      return;
    }

    const mergedPDF = await mergePDFs(pdfDocs);

    // Generate a unique filename with the current timestamp
    const timestamp = new Date().getTime();
    const outputFileName = `${timestamp}.pdf`;
    const outputPath = path.join(outputFolder, outputFileName);

    await fse.writeFile(outputPath, await mergedPDF.save());
    console.log(`Merged PDF saved to ${outputPath}`);
  } catch (err) {
    console.error("Error:", err);
  }
}

// Usage: node mergePDFs.js input_folder output_folder
const inputFolder = process.argv[2] || "input_files";
const outputFolder = process.argv[3] || "output_files";

if (!inputFolder || !outputFolder) {
  console.log("Usage: node mergePDFs.js input_folder output_folder");
} else {
  main(inputFolder, outputFolder);
}
