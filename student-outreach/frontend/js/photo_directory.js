/**
 * Photo Directory & Visual Student Contact Management
 * Handles uploading photos, camera capture, grid rendering, and high-res lightbox
 */

let currentPage = 1;
const pageLimit = 24;
let currentSearchQuery = '';
let photoStudentsList = [];

async function initPhotoDirectoryPage() {
  const user = await requireAuth();
  if (!user) return;

  initNavigation();
  bindSearchEvents();
  bindUploadForm();
  loadPhotoStudents();
}

function bindSearchEvents() {
  const searchInput = document.getElementById('photo-search-input');
  let debounceTimer;

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        currentSearchQuery = e.target.value.trim();
        currentPage = 1;
        loadPhotoStudents();
      }, 350);
    });
  }

  const resetBtn = document.getElementById('btn-reset-photo-search');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      currentSearchQuery = '';
      currentPage = 1;
      loadPhotoStudents();
    });
  }
}

async function loadPhotoStudents() {
  const gridContainer = document.getElementById('photo-grid-container');
  const countEl = document.getElementById('photo-directory-count');
  const paginationContainer = document.getElementById('photo-pagination');

  if (!gridContainer) return;

  gridContainer.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
      <span class="loading-spinner"></span>
      <p style="margin-top:10px; color:var(--text-muted);">Loading student photo directory...</p>
    </div>
  `;

  try {
    let url = `/api/photo-students?page=${currentPage}&limit=${pageLimit}`;
    if (currentSearchQuery) {
      url += `&search=${encodeURIComponent(currentSearchQuery)}`;
    }

    const data = await apiRequest(url);
    photoStudentsList = data.items || [];

    if (countEl) {
      countEl.textContent = `Showing ${photoStudentsList.length} of ${data.total} students with photos`;
    }

    if (photoStudentsList.length === 0) {
      gridContainer.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 30px;">
          <div class="empty-state">
            <i class="fas fa-camera empty-icon" style="width:60px;height:60px;font-size:1.8rem;"></i>
            <div class="empty-title">No Student Photos Found</div>
            <p class="empty-desc">
              ${currentSearchQuery ? 'No results matched your search term.' : 'Start capturing or uploading student profile photos.'}
            </p>
            <button class="btn btn-primary" onclick="openUploadModal()">
              <i class="fas fa-camera-retro"></i> Add First Student Photo
            </button>
          </div>
        </div>
      `;
      if (paginationContainer) paginationContainer.innerHTML = '';
      return;
    }

    // Render large, clear photo cards
    gridContainer.innerHTML = photoStudentsList.map(st => {
      const cleanPhone = st.phone_number.replace(/[^0-9+]/g, '');
      const waLink = getWhatsAppLink(st.phone_number, st.name);

      return `
        <div class="card photo-student-card" style="display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--border-light);box-shadow:var(--shadow-sm);transition:var(--transition);">
          <!-- Clickable Photo for Big Clear View -->
          <div class="photo-thumbnail-wrap" onclick="openBigPhotoModal(${st.id})" title="Tap to view large photo" style="position:relative;width:100%;aspect-ratio:1/1;background:#0f172a;cursor:pointer;overflow:hidden;">
            <img 
              src="${escapeHtml(st.photo_url)}" 
              alt="${escapeHtml(st.name)}" 
              loading="lazy" 
              style="width:100%;height:100%;object-fit:cover;transition:transform 0.3s ease;"
              onmouseover="this.style.transform='scale(1.04)'"
              onmouseout="this.style.transform='scale(1)'"
            />
            <div style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,0.65);color:#fff;font-size:0.75rem;padding:3px 8px;border-radius:var(--radius-full);backdrop-filter:blur(2px);display:flex;align-items:center;gap:4px;">
              <i class="fas fa-expand-alt"></i> Big View
            </div>
          </div>

          <div class="card-body" style="padding:14px;flex:1;display:flex;flex-direction:column;justify-content:space-between;">
            <div>
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;margin-bottom:6px;">
                <h3 style="font-size:1.05rem;font-weight:700;color:var(--text-main);line-height:1.2;">
                  ${escapeHtml(st.name)}
                </h3>
                <div style="display:flex;gap:4px;">
                  <button class="btn btn-secondary btn-icon btn-sm" onclick="openEditPhotoModal(${st.id})" title="Edit Details">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="btn btn-secondary btn-icon btn-sm" style="color:var(--danger);" onclick="confirmDeletePhotoStudent(${st.id}, '${escapeHtml(st.name)}')" title="Delete">
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </div>
              </div>

              <!-- Phone number with click-to-call -->
              <div style="margin-bottom:8px;">
                <a href="tel:${cleanPhone}" style="color:var(--primary);font-weight:600;font-size:0.9rem;display:inline-flex;align-items:center;gap:6px;">
                  <i class="fas fa-phone-alt" style="font-size:0.8rem;"></i> ${escapeHtml(st.phone_number)}
                </a>
              </div>

              ${st.notes ? `
                <p style="font-size:0.82rem;color:var(--text-muted);background:var(--bg-subtle);padding:6px 10px;border-radius:var(--radius-sm);line-height:1.3;margin-bottom:12px;">
                  <i class="fas fa-info-circle"></i> ${escapeHtml(st.notes)}
                </p>
              ` : ''}
            </div>

            <!-- Quick Action Buttons: Big View, Call, WhatsApp -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border-light);">
              <a href="tel:${cleanPhone}" class="btn btn-secondary btn-sm" style="font-size:0.82rem;">
                <i class="fas fa-phone" style="color:var(--primary);"></i> Call
              </a>
              <a href="${waLink}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm" style="color:#16a34a;font-size:0.82rem;">
                <i class="fab fa-whatsapp"></i> WhatsApp
              </a>
            </div>
          </div>
        </div>
      `;
    }).join('');

    renderPagination(data.total, data.page, data.limit, data.total_pages);

  } catch (err) {
    gridContainer.innerHTML = `<div style="grid-column: 1/-1; color:var(--danger); text-align:center; padding:30px;">Failed to load photos: ${escapeHtml(err.message)}</div>`;
  }
}

function renderPagination(total, page, limit, totalPages) {
  const container = document.getElementById('photo-pagination');
  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = `
    <div style="font-size:0.85rem;color:var(--text-muted);">
      Page ${page} of ${totalPages}
    </div>
    <div class="page-numbers">
      <button class="page-btn" ${page <= 1 ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''} onclick="goToPhotoPage(${page - 1})">
        <i class="fas fa-chevron-left"></i>
      </button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="goToPhotoPage(${i})">${i}</button>`;
    } else if (i === page - 2 || i === page + 2) {
      html += `<span style="padding:0 4px;">...</span>`;
    }
  }

  html += `
      <button class="page-btn" ${page >= totalPages ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''} onclick="goToPhotoPage(${page + 1})">
        <i class="fas fa-chevron-right"></i>
      </button>
    </div>
  `;

  container.innerHTML = html;
}

function goToPhotoPage(p) {
  currentPage = p;
  loadPhotoStudents();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================
// Big Clear View Lightbox Modal
// ==========================================
function openBigPhotoModal(studentId) {
  const st = photoStudentsList.find(s => s.id === studentId);
  if (!st) return;

  const modal = document.getElementById('big-photo-modal');
  if (!modal) return;

  const imgEl = document.getElementById('lightbox-photo-img');
  const nameEl = document.getElementById('lightbox-student-name');
  const phoneLink = document.getElementById('lightbox-phone-link');
  const phoneText = document.getElementById('lightbox-phone-text');
  const waBtn = document.getElementById('lightbox-wa-btn');
  const callBtn = document.getElementById('lightbox-call-btn');
  const notesEl = document.getElementById('lightbox-student-notes');
  const downloadLink = document.getElementById('lightbox-download-link');

  if (imgEl) imgEl.src = st.photo_url;
  if (nameEl) nameEl.textContent = st.name;

  const cleanPhone = st.phone_number.replace(/[^0-9+]/g, '');
  if (phoneText) phoneText.textContent = st.phone_number;
  if (phoneLink) phoneLink.href = `tel:${cleanPhone}`;
  if (callBtn) callBtn.href = `tel:${cleanPhone}`;
  if (waBtn) waBtn.href = getWhatsAppLink(st.phone_number, st.name);

  if (notesEl) {
    if (st.notes) {
      notesEl.textContent = st.notes;
      notesEl.style.display = 'block';
    } else {
      notesEl.style.display = 'none';
    }
  }

  if (downloadLink) {
    downloadLink.href = st.photo_url;
    downloadLink.download = `${st.name.replace(/\s+/g, '_')}_photo.jpg`;
  }

  modal.classList.add('active');
}

// ==========================================
// Upload & Edit Modals Logic (Mobile Optimized)
// ==========================================

let currentUploadFile = null;
let currentUploadPreviewUrl = null;
let currentEditFile = null;
let currentEditPreviewUrl = null;
let originalEditPhotoUrl = null;

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function validateImageFile(file) {
  if (!file) return { valid: false, error: 'No photo selected.' };

  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.heic', '.heif'];
  const fileName = (file.name || '').toLowerCase();
  const hasValidExt = validExtensions.some(ext => fileName.endsWith(ext));
  const isImageMime = file.type ? file.type.startsWith('image/') : true;

  if (!hasValidExt && !isImageMime) {
    return { valid: false, error: 'Please select a valid image file (JPG, PNG, WebP, HEIC).' };
  }

  // 10 MB limit
  const maxBytes = 10 * 1024 * 1024;
  if (file.size > maxBytes) {
    return { 
      valid: false, 
      error: `Photo size (${formatBytes(file.size)}) exceeds the 10MB limit. Please choose a smaller photo.` 
    };
  }

  return { valid: true };
}

function resetUploadModalState() {
  currentUploadFile = null;
  if (currentUploadPreviewUrl) {
    URL.revokeObjectURL(currentUploadPreviewUrl);
    currentUploadPreviewUrl = null;
  }

  const galleryInput = document.getElementById('upload-photo-gallery');
  const cameraInput = document.getElementById('upload-photo-camera');
  if (galleryInput) galleryInput.value = '';
  if (cameraInput) cameraInput.value = '';

  const previewWrap = document.getElementById('upload-preview-wrap');
  const pickerBox = document.getElementById('upload-picker-box');
  const previewImg = document.getElementById('upload-preview-img');

  if (previewImg) previewImg.src = '';
  if (previewWrap) previewWrap.style.display = 'none';
  if (pickerBox) pickerBox.style.display = 'block';
}

function openUploadModal() {
  const modal = document.getElementById('upload-photo-modal');
  const form = document.getElementById('form-upload-photo');

  if (form) form.reset();
  resetUploadModalState();

  if (modal) modal.classList.add('active');
}

function bindUploadForm() {
  const galleryInput = document.getElementById('upload-photo-gallery');
  const cameraInput = document.getElementById('upload-photo-camera');
  const btnTriggerGallery = document.getElementById('btn-trigger-gallery');
  const btnTriggerCamera = document.getElementById('btn-trigger-camera');
  const btnReplacePhoto = document.getElementById('btn-replace-photo');
  const btnRemovePhoto = document.getElementById('btn-remove-photo');
  const previewWrap = document.getElementById('upload-preview-wrap');
  const pickerBox = document.getElementById('upload-picker-box');
  const previewImg = document.getElementById('upload-preview-img');
  const previewName = document.getElementById('upload-preview-name');
  const previewSize = document.getElementById('upload-preview-size');
  const form = document.getElementById('form-upload-photo');
  const btnSubmit = document.getElementById('btn-submit-photo-upload');

  // Trigger mobile gallery picker
  if (btnTriggerGallery && galleryInput) {
    btnTriggerGallery.addEventListener('click', (e) => {
      e.preventDefault();
      galleryInput.click();
    });
  }

  // Trigger mobile camera capture
  if (btnTriggerCamera && cameraInput) {
    btnTriggerCamera.addEventListener('click', (e) => {
      e.preventDefault();
      cameraInput.click();
    });
  }

  // Handle selected photo (from either gallery or camera)
  const handleFile = (file) => {
    if (!file) return;

    const check = validateImageFile(file);
    if (!check.valid) {
      showToast(check.error, 'error');
      if (galleryInput) galleryInput.value = '';
      if (cameraInput) cameraInput.value = '';
      return;
    }

    currentUploadFile = file;
    if (currentUploadPreviewUrl) {
      URL.revokeObjectURL(currentUploadPreviewUrl);
    }
    currentUploadPreviewUrl = URL.createObjectURL(file);

    if (previewImg) previewImg.src = currentUploadPreviewUrl;
    if (previewName) previewName.textContent = file.name || 'camera_photo.jpg';
    if (previewSize) previewSize.textContent = formatBytes(file.size);

    if (pickerBox) pickerBox.style.display = 'none';
    if (previewWrap) previewWrap.style.display = 'block';
  };

  if (galleryInput) {
    galleryInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      handleFile(file);
    });
  }

  if (cameraInput) {
    cameraInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      handleFile(file);
    });
  }

  // Replace photo button
  if (btnReplacePhoto && galleryInput) {
    btnReplacePhoto.addEventListener('click', () => {
      galleryInput.click();
    });
  }

  // Remove photo button
  if (btnRemovePhoto) {
    btnRemovePhoto.addEventListener('click', () => {
      resetUploadModalState();
      showToast('Photo removed. Select a new photo or capture one.', 'info');
    });
  }

  // Form submission
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('upload-name').value.trim();
      const phone = document.getElementById('upload-phone').value.trim();
      const notes = document.getElementById('upload-notes').value.trim();

      if (!name || !phone) {
        showToast('Please enter both student name and phone number', 'error');
        return;
      }

      if (!currentUploadFile) {
        showToast('Please select or capture a photo of the student first', 'error');
        return;
      }

      const formData = new FormData();
      formData.append('name', name);
      formData.append('phone_number', phone);
      if (notes) formData.append('notes', notes);
      formData.append('photo', currentUploadFile, currentUploadFile.name || 'student_photo.jpg');

      const origText = btnSubmit.innerHTML;
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = `<span class="loading-spinner" style="width:18px;height:18px;border-width:2px;"></span> Uploading Photo...`;

      try {
        await apiRequest('/api/photo-students', {
          method: 'POST',
          body: formData
        });

        showToast(`Student photo for "${name}" uploaded successfully!`, 'success');
        document.getElementById('upload-photo-modal').classList.remove('active');
        form.reset();
        resetUploadModalState();
        loadPhotoStudents();

      } catch (err) {
        showToast(`Upload failed: ${err.message}`, 'error');
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = origText;
      }
    });
  }

  // Bind Edit Modal Pickers
  bindEditModalPickers();
}

function bindEditModalPickers() {
  const editGalleryInput = document.getElementById('edit-photo-gallery');
  const editCameraInput = document.getElementById('edit-photo-camera');
  const btnEditGallery = document.getElementById('btn-edit-pick-gallery');
  const btnEditCamera = document.getElementById('btn-edit-pick-camera');
  const btnEditRevert = document.getElementById('btn-edit-revert-photo');
  const editPreviewImg = document.getElementById('edit-preview-img');
  const statusBadge = document.getElementById('edit-photo-status-badge');

  if (btnEditGallery && editGalleryInput) {
    btnEditGallery.addEventListener('click', (e) => {
      e.preventDefault();
      editGalleryInput.click();
    });
  }

  if (btnEditCamera && editCameraInput) {
    btnEditCamera.addEventListener('click', (e) => {
      e.preventDefault();
      editCameraInput.click();
    });
  }

  const handleEditFile = (file) => {
    if (!file) return;

    const check = validateImageFile(file);
    if (!check.valid) {
      showToast(check.error, 'error');
      if (editGalleryInput) editGalleryInput.value = '';
      if (editCameraInput) editCameraInput.value = '';
      return;
    }

    currentEditFile = file;
    if (currentEditPreviewUrl) {
      URL.revokeObjectURL(currentEditPreviewUrl);
    }
    currentEditPreviewUrl = URL.createObjectURL(file);

    if (editPreviewImg) editPreviewImg.src = currentEditPreviewUrl;
    if (statusBadge) statusBadge.style.display = 'inline-flex';
    if (btnEditRevert) btnEditRevert.style.display = 'inline-flex';
  };

  if (editGalleryInput) {
    editGalleryInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      handleEditFile(file);
    });
  }

  if (editCameraInput) {
    editCameraInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      handleEditFile(file);
    });
  }

  if (btnEditRevert) {
    btnEditRevert.addEventListener('click', () => {
      currentEditFile = null;
      if (currentEditPreviewUrl) {
        URL.revokeObjectURL(currentEditPreviewUrl);
        currentEditPreviewUrl = null;
      }
      if (editGalleryInput) editGalleryInput.value = '';
      if (editCameraInput) editCameraInput.value = '';
      if (editPreviewImg && originalEditPhotoUrl) {
        editPreviewImg.src = originalEditPhotoUrl;
      }
      if (statusBadge) statusBadge.style.display = 'none';
      if (btnEditRevert) btnEditRevert.style.display = 'none';
      showToast('Reverted to original photo', 'info');
    });
  }
}

async function openEditPhotoModal(studentId) {
  try {
    const st = await apiRequest(`/api/photo-students/${studentId}`);
    const modal = document.getElementById('edit-photo-modal');
    if (!modal) return;

    currentEditFile = null;
    originalEditPhotoUrl = st.photo_url;
    if (currentEditPreviewUrl) {
      URL.revokeObjectURL(currentEditPreviewUrl);
      currentEditPreviewUrl = null;
    }

    document.getElementById('edit-photo-id').value = st.id;
    document.getElementById('edit-photo-name').value = st.name;
    document.getElementById('edit-photo-phone').value = st.phone_number;
    document.getElementById('edit-photo-notes').value = st.notes || '';
    
    const editPreviewImg = document.getElementById('edit-preview-img');
    if (editPreviewImg) editPreviewImg.src = st.photo_url;

    const statusBadge = document.getElementById('edit-photo-status-badge');
    const btnEditRevert = document.getElementById('btn-edit-revert-photo');
    if (statusBadge) statusBadge.style.display = 'none';
    if (btnEditRevert) btnEditRevert.style.display = 'none';

    const editGalleryInput = document.getElementById('edit-photo-gallery');
    const editCameraInput = document.getElementById('edit-photo-camera');
    if (editGalleryInput) editGalleryInput.value = '';
    if (editCameraInput) editCameraInput.value = '';

    modal.classList.add('active');

    const form = document.getElementById('form-edit-photo');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const updatedName = document.getElementById('edit-photo-name').value.trim();
      const updatedPhone = document.getElementById('edit-photo-phone').value.trim();
      const updatedNotes = document.getElementById('edit-photo-notes').value.trim();

      const formData = new FormData();
      formData.append('name', updatedName);
      formData.append('phone_number', updatedPhone);
      formData.append('notes', updatedNotes);
      if (currentEditFile) {
        formData.append('photo', currentEditFile, currentEditFile.name || 'replacement.jpg');
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      const origText = submitBtn ? submitBtn.innerHTML : 'Save Changes';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="loading-spinner" style="width:16px;height:16px;border-width:2px;"></span> Saving...`;
      }

      try {
        await apiRequest(`/api/photo-students/${st.id}`, {
          method: 'PUT',
          body: formData
        });

        showToast('Student photo details updated!', 'success');
        modal.classList.remove('active');
        loadPhotoStudents();

      } catch (err) {
        showToast(`Update failed: ${err.message}`, 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origText;
        }
      }
    };

  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

function confirmDeletePhotoStudent(studentId, studentName) {
  const modal = document.getElementById('delete-photo-modal');
  const nameEl = document.getElementById('delete-photo-student-name');
  const confirmBtn = document.getElementById('btn-confirm-delete-photo');

  if (modal && confirmBtn) {
    if (nameEl) nameEl.textContent = studentName;
    modal.classList.add('active');

    confirmBtn.onclick = async () => {
      try {
        await apiRequest(`/api/photo-students/${studentId}`, { method: 'DELETE' });
        showToast(`Student "${studentName}" deleted successfully`, 'success');
        modal.classList.remove('active');
        loadPhotoStudents();
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  }
}
