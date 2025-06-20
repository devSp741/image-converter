$(document).ready(() => {
    // --- State ---
    let uploadedFiles = []; // Array to hold file data { id, file, previewUrl, originalSize, originalWidth, originalHeight }
    let fileCounter = 0; // Simple ID generator
    let conversionInProgress = false;

    // --- DOM References ---
    const $dropZone = $('#drop-zone');
    const $fileInput = $('#fileInput');
    const $uploadArea = $('#upload-area');
    const $controlsArea = $('#controls-area');
    const $previewContainer = $('#preview-container');
    const $formatSelect = $('#formatSelect');
    const $qualityControl = $('#quality-control');
    const $qualitySlider = $('#qualitySlider');
    const $qualityValue = $('#qualityValue');
    const $resizeControl = $('#resize-control');
    const $resizeWidth = $('#resizeWidth');
    const $resizeHeight = $('#resizeHeight');
    const $keepAspectRatio = $('#keepAspectRatio');
    const $convertBtn = $('#convertBtn');
    const $progressArea = $('#progress-area');
    const $progressBar = $('#progress-bar');
    const $progressPercentage = $('#progress-percentage');
    const $progressStatus = $('#progress-status');
    const $downloadArea = $('#download-area');
    const $downloadLinks = $('#download-links');
    const $clearAllBtn = $('#clearAllBtn');
    const $darkModeToggle = $('#darkModeToggle');
    const $darkModeIcon = $darkModeToggle.find('i');
    const $html = $('html');

    // --- Initial Setup ---
    initializeTooltips();
    setupDarkMode();
    updateYear();

    // --- Event Listeners ---
    $dropZone.on('dragover', handleDragOver);
    $dropZone.on('dragleave', handleDragLeave);
    $dropZone.on('drop', handleDrop);
    $fileInput.on('change', handleFileSelect);
    $previewContainer.on('click', '.remove-btn', handleRemoveFile);
    $formatSelect.on('change', handleFormatChange);
    $qualitySlider.on('input', handleQualityChange); // Use 'input' for live update
    $convertBtn.on('click', startConversion);
    $clearAllBtn.on('click', resetConverter);
    $darkModeToggle.on('click', toggleDarkMode);
    $resizeWidth.on('input', handleResizeInput);
    $resizeHeight.on('input', handleResizeInput);
    $keepAspectRatio.on('change', handleResizeInput);


    // --- Functions ---

    function initializeTooltips() {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    function setupDarkMode() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        setTheme(savedTheme);
    }

    function setTheme(theme) {
        $html.attr('data-bs-theme', theme);
        if (theme === 'dark') {
            $darkModeIcon.removeClass('bi-moon-stars-fill').addClass('bi-sun-fill');
        } else {
            $darkModeIcon.removeClass('bi-sun-fill').addClass('bi-moon-stars-fill');
        }
        localStorage.setItem('theme', theme);
    }

    function toggleDarkMode() {
        const currentTheme = $html.attr('data-bs-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    }

    function updateYear() {
        $('#year').text(new Date().getFullYear());
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        $dropZone.addClass('drag-over');
    }

    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        $dropZone.removeClass('drag-over');
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        $dropZone.removeClass('drag-over');
        const files = e.originalEvent.dataTransfer.files;
        processFiles(files);
    }

    function handleFileSelect(e) {
        const files = e.target.files;
        processFiles(files);
        // Reset file input to allow uploading the same file again
        $fileInput.val('');
    }

    function processFiles(files) {
        if (conversionInProgress) return; // Don't allow adding files during conversion

        let fileList = Array.from(files);

        // Basic filtering (optional)
        fileList = fileList.filter(file => file.type.startsWith('image/'));

        if (fileList.length === 0) {
            // Maybe show an error message if non-image files were dropped
            console.warn("No valid image files selected.");
            return;
        }

        // Show controls and hide upload area if this is the first batch
        if (uploadedFiles.length === 0) {
            $uploadArea.hide();
            $controlsArea.addClass('fade-in').show();
        }

        let readPromises = fileList.map(file => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        const fileData = {
                            id: `file-${fileCounter++}`,
                            file: file,
                            previewUrl: event.target.result,
                            originalSize: file.size,
                            originalWidth: img.naturalWidth,
                            originalHeight: img.naturalHeight
                        };
                        uploadedFiles.push(fileData);
                        resolve(fileData); // Resolve with fileData for rendering
                    };
                    img.onerror = (err) => {
                       console.error("Error loading image for preview:", file.name, err);
                       // Optionally resolve with null or reject to skip this file
                       resolve(null);
                    };
                    img.src = event.target.result;
                };
                reader.onerror = (error) => {
                    console.error("FileReader error:", error);
                    reject(error);
                };
                reader.readAsDataURL(file);
            });
        });

        // Wait for all files to be read and dimensions determined
        Promise.all(readPromises).then(results => {
             renderPreviews();
             updateConvertButtonState();
        }).catch(error => {
            console.error("Error processing files:", error);
            alert("An error occurred while processing files. Please check the console.");
            // Optionally reset or handle partial success
        });
    }

     function renderPreviews() {
         $previewContainer.empty(); // Clear existing previews

         uploadedFiles.forEach(fileData => {
             const previewHtml = `
                 <div class="col">
                     <div class="preview-item" id="${fileData.id}">
                         <button type="button" class="remove-btn" data-file-id="${fileData.id}" aria-label="Remove image">×</button>
                         <img src="${fileData.previewUrl}" alt="${fileData.file.name}">
                         <div class="file-info" data-bs-toggle="tooltip" title="${fileData.file.name}">${truncateFilename(fileData.file.name, 20)}</div>
                         <div class="file-size">${formatBytes(fileData.originalSize)} (${fileData.originalWidth}x${fileData.originalHeight})</div>
                     </div>
                 </div>`;
             $previewContainer.append(previewHtml);
         });
         // Re-initialize tooltips for new elements
         initializeTooltips();
     }

    function handleRemoveFile(e) {
        if (conversionInProgress) return;
        const fileId = $(e.target).data('file-id');
        uploadedFiles = uploadedFiles.filter(f => f.id !== fileId);
        $(`#${fileId}`).closest('.col').remove(); // Remove the column containing the preview item

        updateConvertButtonState();

        if (uploadedFiles.length === 0) {
            // Optionally reset back to upload state
             resetConverter(false); // Don't clear downloads yet
        }
    }

    function handleFormatChange() {
        const format = $formatSelect.val();
        if (format === 'jpg' || format === 'webp') {
            $qualityControl.show();
        } else {
            $qualityControl.hide();
        }
        updateConvertButtonState();
    }

    function handleQualityChange() {
        $qualityValue.text($qualitySlider.val());
    }

    function updateConvertButtonState() {
        const formatSelected = $formatSelect.val() && $formatSelect.val() !== "";
        $convertBtn.prop('disabled', uploadedFiles.length === 0 || !formatSelected || conversionInProgress);
    }

    function handleResizeInput() {
        const $changedInput = $(this); // Input element that triggered the event
        const keepAspect = $keepAspectRatio.is(':checked');
        const fileData = uploadedFiles[0]; // Use first image for aspect ratio base, or iterate if needed

        if (!keepAspect || !fileData) return; // Exit if checkbox unchecked or no images

        const originalRatio = fileData.originalWidth / fileData.originalHeight;

        if ($changedInput.is($resizeWidth)) {
            const newWidth = parseInt($resizeWidth.val(), 10);
            if (newWidth > 0) {
                $resizeHeight.val(Math.round(newWidth / originalRatio));
            } else {
                // If width is cleared or invalid, clear height too
                 if ($resizeWidth.val() === '') $resizeHeight.val('');
            }
        } else if ($changedInput.is($resizeHeight)) {
             const newHeight = parseInt($resizeHeight.val(), 10);
             if (newHeight > 0) {
                $resizeWidth.val(Math.round(newHeight * originalRatio));
             } else {
                 // If height is cleared or invalid, clear width too
                  if ($resizeHeight.val() === '') $resizeWidth.val('');
             }
        } else if ($changedInput.is($keepAspectRatio)) {
            // If checkbox is checked *now*, recalculate based on width (or height if width empty)
            if (keepAspect) {
                 const currentWidth = parseInt($resizeWidth.val(), 10);
                 const currentHeight = parseInt($resizeHeight.val(), 10);
                 if (currentWidth > 0) {
                     $resizeHeight.val(Math.round(currentWidth / originalRatio));
                 } else if (currentHeight > 0) {
                     $resizeWidth.val(Math.round(currentHeight * originalRatio));
                 }
            }
        }
    }


    async function startConversion() {
        if (uploadedFiles.length === 0 || !$formatSelect.val() || conversionInProgress) {
            return;
        }

        conversionInProgress = true;
        updateConvertButtonState(); // Disable button
        $downloadArea.hide();
        $downloadLinks.empty(); // Clear previous links
        $progressArea.show();
        $progressBar.css('width', '0%').removeClass('bg-danger').addClass('bg-success');
        $progressPercentage.text('0%');
        $progressStatus.text(`Preparing conversion...`);

        const targetFormat = $formatSelect.val();
        const quality = (targetFormat === 'jpg' || targetFormat === 'webp') ? parseFloat($qualitySlider.val()) : undefined;
        const targetWidth = parseInt($resizeWidth.val(), 10) || null;
        const targetHeight = parseInt($resizeHeight.val(), 10) || null;
        const keepAspect = $keepAspectRatio.is(':checked');

        const conversionPromises = [];
        let filesProcessed = 0;
        const totalFiles = uploadedFiles.length;

        for (const fileData of uploadedFiles) {
            conversionPromises.push(
                convertImage(fileData, targetFormat, quality, targetWidth, targetHeight, keepAspect)
                .then(result => {
                    filesProcessed++;
                    const percentage = Math.round((filesProcessed / totalFiles) * 100);
                    $progressBar.css('width', percentage + '%');
                    $progressPercentage.text(percentage + '%');
                    $progressStatus.text(`Converting ${fileData.file.name}...`);
                    displayDownloadLink(result);
                })
                .catch(error => {
                    filesProcessed++; // Count as processed even if failed
                    const percentage = Math.round((filesProcessed / totalFiles) * 100);
                    $progressBar.css('width', percentage + '%');
                    $progressPercentage.text(percentage + '%');
                    console.error(`Failed to convert ${fileData.file.name}:`, error);
                     displayErrorLink(fileData, error.message || 'Conversion failed');
                     // Optional: Change progress bar to red on first error
                     $progressBar.addClass('bg-danger').removeClass('bg-success');
                })
            );
        }

        try {
            await Promise.all(conversionPromises);
            $progressStatus.text("Conversion complete!");
            $downloadArea.addClass('fade-in').show();

        } catch (error) {
            // This catch might not be strictly necessary if individual errors are handled
            console.error("An error occurred during the batch conversion:", error);
            $progressStatus.text("Conversion finished with errors.");
            $progressBar.addClass('bg-danger').removeClass('bg-success');
             $downloadArea.addClass('fade-in').show(); // Show results even with errors
        } finally {
            conversionInProgress = false;
            // Don't re-enable convert button here, force reset via 'Clear All'
            // updateConvertButtonState();
             // Hide progress after a short delay
             setTimeout(() => $progressArea.hide(), 2000);
        }
    }

    function convertImage(fileData, targetFormat, quality, targetWidth, targetHeight, keepAspect) {
        return new Promise((resolve, reject) => {
            const mimeTypeMap = {
                jpg: 'image/jpeg',
                png: 'image/png',
                webp: 'image/webp',
                gif: 'image/gif', // Canvas can draw GIF but not animate output well
                bmp: 'image/bmp', // Limited browser support for *encoding* BMP
            };

            const targetMimeType = mimeTypeMap[targetFormat];

            // --- Simulate unsupported formats ---
            if (!targetMimeType && !['svg', 'tiff', 'avif'].includes(targetFormat)) {
                 return reject(new Error(`Format ${targetFormat.toUpperCase()} is not supported for conversion in this demo.`));
            }
            if (['tiff', 'avif'].includes(targetFormat)) {
                 console.warn(`Conversion to ${targetFormat.toUpperCase()} is simulated.`);
                 // Simulate by returning original or a placeholder? Here we reject.
                 return reject(new Error(`Conversion to ${targetFormat.toUpperCase()} requires advanced libraries (WASM/Server) and is not implemented here.`));
            }
            // Special handling for SVG target
            if (targetFormat === 'svg') {
                 if (fileData.file.type === 'image/svg+xml') {
                     // If input is SVG, just pass it through (maybe resize?)
                     console.warn("SVG to SVG conversion is currently a direct pass-through.");
                     // Create a blob from the original SVG file for consistency
                     const blob = new Blob([fileData.file], { type: 'image/svg+xml' });
                      resolve({
                          blob: blob,
                          name: generateFilename(fileData.file.name, targetFormat),
                          originalSize: fileData.originalSize,
                          newSize: blob.size,
                          originalFilename: fileData.file.name // Keep original name for display
                      });
                     return; // Don't proceed with canvas rendering
                 } else {
                     // Raster to SVG (Vectorization) is too complex for client-side demo
                      return reject(new Error(`Converting raster images to SVG (Vectorization) is not supported.`));
                 }
            }


            // --- Canvas-based Conversion ---
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                let drawWidth = img.naturalWidth;
                let drawHeight = img.naturalHeight;
                let canvasWidth = img.naturalWidth;
                let canvasHeight = img.naturalHeight;

                // Handle resizing
                if (targetWidth || targetHeight) {
                    const originalRatio = img.naturalWidth / img.naturalHeight;
                    if (targetWidth && targetHeight && !keepAspect) {
                        canvasWidth = targetWidth;
                        canvasHeight = targetHeight;
                    } else if (targetWidth) {
                        canvasWidth = targetWidth;
                        canvasHeight = keepAspect ? Math.round(targetWidth / originalRatio) : img.naturalHeight; // Use original height if aspect not kept
                    } else if (targetHeight) { // Only targetHeight is set
                        canvasHeight = targetHeight;
                        canvasWidth = keepAspect ? Math.round(targetHeight * originalRatio) : img.naturalWidth; // Use original width if aspect not kept
                    }
                    // Ensure valid dimensions
                    canvasWidth = Math.max(1, canvasWidth);
                    canvasHeight = Math.max(1, canvasHeight);
                }

                canvas.width = canvasWidth;
                canvas.height = canvasHeight;

                // Draw image (resizing happens here if canvas size changed)
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Export from canvas
                try {
                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                reject(new Error(`Could not create Blob for ${targetFormat}. Browser might not support encoding this format/quality.`));
                                return;
                            }
                            resolve({
                                blob: blob,
                                name: generateFilename(fileData.file.name, targetFormat),
                                originalSize: fileData.originalSize,
                                newSize: blob.size,
                                originalFilename: fileData.file.name
                            });
                        },
                        targetMimeType, // Use the determined MIME type
                        quality // Quality argument (ignored for PNG, GIF, BMP)
                    );
                } catch (e) {
                    // Catch potential errors like unsupported MIME types in toBlob itself
                     reject(new Error(`Canvas conversion error: ${e.message}`));
                }
            };
            img.onerror = (err) => {
                 console.error("Image loading error during conversion:", fileData.file.name, err);
                 reject(new Error(`Failed to load image ${fileData.file.name}`));
            };
            // Use the preview URL (Data URL) which is already loaded
            img.src = fileData.previewUrl;
        });
    }

    function displayDownloadLink(result) {
        const url = URL.createObjectURL(result.blob);
        const downloadHtml = `
            <div class="list-group-item download-link-item">
                <div class="file-details">
                    <span class="fw-bold">${result.name}</span>
                    <span class="original-size text-muted">
                        Original: ${result.originalFilename} (${formatBytes(result.originalSize)}) → New Size: ${formatBytes(result.newSize)}
                    </span>
                </div>
                <a href="${url}" download="${result.name}" class="btn btn-sm btn-success btn-download" role="button">
                    <i class="bi bi-download me-1"></i> Download
                </a>
            </div>`;
        $downloadLinks.append(downloadHtml);

    }

    function displayErrorLink(fileData, errorMessage) {
         const errorHtml = `
            <div class="list-group-item download-link-item list-group-item-danger">
                <div class="file-details">
                    <span class="fw-bold">${truncateFilename(fileData.file.name, 30)} - Failed</span>
                    <span class="text-danger"><small>${errorMessage}</small></span>
                </div>
                <span class="badge bg-danger">Error</span>
            </div>`;
         $downloadLinks.append(errorHtml);
    }


    function resetConverter(fullReset = true) {
        uploadedFiles = [];
        fileCounter = 0;
        conversionInProgress = false;

        $controlsArea.hide();
        $progressArea.hide();
        $downloadArea.hide();
        $previewContainer.empty();
        $downloadLinks.empty();
        $uploadArea.addClass('fade-in').show();

        // Clear resize inputs
        $resizeWidth.val('');
        $resizeHeight.val('');
        $keepAspectRatio.prop('checked', true);

        // Reset format dropdown and quality slider
        $formatSelect.prop('selectedIndex', 0);
        $qualityControl.hide();
        $qualitySlider.val(0.9);
        $qualityValue.text(0.9);

        // Re-enable convert button but make it disabled initially
        $convertBtn.prop('disabled', true);

        // Clean up object URLs if needed (more complex implementation)
        // If fullReset is false (e.g., called when last file removed), keep downloads visible
        if (!fullReset) {
             $downloadArea.show();
             $controlsArea.hide(); // Ensure controls stay hidden if no files left
             $uploadArea.show(); // Show upload if controls are hidden
        } else {
            $downloadArea.hide();
            // Cleanup any existing Object URLs from previous downloads to free memory
            $downloadLinks.find('a[href^="blob:"]').each(function() {
                 URL.revokeObjectURL($(this).attr('href'));
            });
             $downloadLinks.empty(); // Ensure it's empty on full reset
        }
    }

    // --- Utility Functions ---

    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    function truncateFilename(name, maxLength = 20) {
         if (name.length <= maxLength) return name;
         const ext = name.substring(name.lastIndexOf('.'));
         const base = name.substring(0, name.lastIndexOf('.'));
         return base.substring(0, maxLength - ext.length - 3) + '...' + ext;
     }

    function generateFilename(originalName, targetFormat) {
        const baseName = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
        // Ensure filename is safe for file systems (basic sanitization)
        const safeBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
        return `${safeBaseName}_converted.${targetFormat.toLowerCase()}`;
    }

}); // End $(document).ready