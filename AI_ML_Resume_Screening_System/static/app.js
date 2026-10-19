const $ = (id) => document.getElementById(id);
let selectedFiles = [];
let currentResults = [];
let scoreChart = null;
let componentChart = null;

function showMessage(text, kind = "error") {
  const box = $("message");
  box.textContent = text;
  box.hidden = false;
  box.style.background = kind === "success" ? "#eaf9f0" : "#fff3f1";
  box.style.color = kind === "success" ? "#19734f" : "#b84b42";
}
function hideMessage() { $("message").hidden = true; }

function renderFiles() {
  const root = $("fileList");
  root.innerHTML = "";
  if (!selectedFiles.length) {
    root.innerHTML = '<div class="empty-files">No files selected yet</div>';
    return;
  }
  selectedFiles.forEach((file, index) => {
    const row = document.createElement("div");
    row.className = "file-row";
    const ext = file.name.includes(".") ? file.name.split(".").pop().toUpperCase() : "FILE";
    row.innerHTML = `<span class="file-badge">${ext}</span><span class="file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span><span style="color:#9ca5b3">${formatBytes(file.size)}</span><button class="remove-file" type="button" aria-label="Remove ${escapeHtml(file.name)}">×</button>`;
    row.querySelector("button").addEventListener("click", () => {
      selectedFiles.splice(index, 1);
      renderFiles();
    });
    root.appendChild(row);
  });
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}
function addFiles(fileList) {
  const allowed = ["pdf", "docx", "txt"];
  const incoming = Array.from(fileList || []);
  const invalid = incoming.filter(f => !allowed.includes((f.name.split(".").pop() || "").toLowerCase()));
  if (invalid.length) showMessage(`Unsupported file type: ${invalid.map(f => f.name).join(", ")}. Use PDF, DOCX, or TXT.`);
  const valid = incoming.filter(f => allowed.includes((f.name.split(".").pop() || "").toLowerCase()));
  valid.forEach(file => {
    if (!selectedFiles.some(f => f.name === file.name && f.size === file.size)) selectedFiles.push(file);
  });
  if (selectedFiles.length > 10) {
    selectedFiles = selectedFiles.slice(0, 10);
    showMessage("Maximum 10 resumes per screening. Extra files were not added.");
  }
  renderFiles();
}
$("resumeFiles").addEventListener("change", e => { addFiles(e.target.files); e.target.value = ""; });
const dropzone = $("dropzone");
dropzone.addEventListener("dragover", e => { e.preventDefault(); dropzone.classList.add("dragover"); });
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
dropzone.addEventListener("drop", e => { e.preventDefault(); dropzone.classList.remove("dragover"); addFiles(e.dataTransfer.files); });
dropzone.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("resumeFiles").click(); } });
$("scrollToInput").addEventListener("click", () => $("inputSection").scrollIntoView({behavior:"smooth"}));

$("demoBtn").addEventListener("click", async () => {
  try {
    const response = await fetch("/api/demo");
    const data = await response.json();
    $("jobDescription").value = data.job_description;
    $("requiredSkills").value = data.required_skills;
    showMessage("Demo job description loaded. Add the sample resumes or your own files.", "success");
  } catch {
    showMessage("Could not load demo. Please enter a job description manually.");
  }
});

$("analyzeBtn").addEventListener("click", async () => {
  hideMessage();
  const job = $("jobDescription").value.trim();
  if (job.length < 20) return showMessage("Please enter a job description of at least 20 characters.");
  if (!selectedFiles.length) return showMessage("Please upload at least one resume file.");
  if (selectedFiles.length > 10) return showMessage("Please upload no more than 10 resumes.");
  const form = new FormData();
  form.append("job_description", job);
  form.append("required_skills", $("requiredSkills").value);
  selectedFiles.forEach(file => form.append("resumes", file, file.name));
  $("analyzeBtn").disabled = true;
  $("loadingBar").hidden = false;
  $("analyzeBtn").innerHTML = '<span>✦</span> Analyzing…';
  try {
    const response = await fetch("/api/analyze", {method:"POST", body:form});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Analysis failed.");
    currentResults = data.results || [];
    if (!currentResults.length) throw new Error("No resumes could be analyzed. Check the file text and formats.");
    renderResults(currentResults, data);
    showMessage(`Analysis complete: ${currentResults.length} resume(s) processed. Review evidence before making decisions.`, "success");
    $("resultsSection").hidden = false;
    $("resultsSection").scrollIntoView({behavior:"smooth", block:"start"});
  } catch (error) {
    showMessage(error.message || "Something went wrong. Please try again.");
  } finally {
    $("analyzeBtn").disabled = false;
    $("analyzeBtn").innerHTML = '<span>✦</span> Analyze resumes <b>→</b>';
    $("loadingBar").hidden = true;
  }
});

function renderResults(results, data) {
  $("statCount").textContent = results.length;
  $("statAverage").innerHTML = `${data.average_score ?? 0}<small>%</small>`;
  $("statTop").innerHTML = `${results[0].score}<small>%</small>`;
  $("statTopName").textContent = results[0].filename;
  $("modelNote").textContent = data.model_note || "Prototype scores are exploratory signals and are not validated hiring predictions.";
  const body = $("resultsBody");
  body.innerHTML = "";
  results.forEach((r, index) => {
    const tr = document.createElement("tr");
    const initials = r.filename.replace(/\.[^.]+$/, "").split(/[_\s-]+/).filter(Boolean).slice(0,2).map(s => s[0]).join("").toUpperCase() || "CV";
    tr.innerHTML = `<td><span class="rank">${index + 1}</span></td>
      <td><div class="candidate-cell"><span class="candidate-avatar">${escapeHtml(initials)}</span><div><div class="candidate-name" title="${escapeHtml(r.filename)}">${escapeHtml(r.filename)}</div><div class="candidate-type">Resume profile</div></div></div></td>
      <td><div class="score-number">${r.score}%</div><div class="score-track"><span style="width:${Math.max(0,Math.min(100,r.score))}%"></span></div></td>
      <td><span class="mini-score">${r.semantic_score}%</span></td><td><span class="mini-score">${r.skill_score}%</span></td><td><span class="mini-score">${r.ml_probability}%</span></td>
      <td><button type="button" class="details-btn" data-index="${index}">View details ↗</button></td>`;
    body.appendChild(tr);
  });
  body.querySelectorAll(".details-btn").forEach(btn => btn.addEventListener("click", () => showDetails(results[Number(btn.dataset.index)])));
  renderCharts(results);
  showDetails(results[0]);
  const errors = $("errorsBox");
  if (data.errors && data.errors.length) {
    errors.hidden = false;
    errors.textContent = "Some files could not be processed: " + data.errors.join(" | ");
  } else errors.hidden = true;
}

function renderCharts(results) {
  if (typeof Chart === "undefined") return;
  if (scoreChart) scoreChart.destroy();
  if (componentChart) componentChart.destroy();
  scoreChart = new Chart($("scoreChart"), {
    type:"bar",
    data:{labels:results.map(r => shortName(r.filename)), datasets:[{label:"Match score",data:results.map(r=>r.score),backgroundColor:"#7968ec",borderRadius:6,maxBarThickness:34}]},
    options:{responsive:true,maintainAspectRatio:false,indexAxis:"y",plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` ${c.raw}%`}}},scales:{x:{min:0,max:100,grid:{color:"#edf0f5"},ticks:{callback:v=>v+"%",font:{size:10}}},y:{grid:{display:false},ticks:{font:{size:10}}}}}
  });
  const top = results[0];
  componentChart = new Chart($("componentChart"), {
    type:"doughnut",
    data:{labels:["Semantic AI","Skill coverage","ML demo"],datasets:[{data:[top.semantic_score,top.skill_score,top.ml_probability],backgroundColor:["#7968ec","#43b98a","#f1b45e"],borderWidth:0,hoverOffset:5}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:"70%",plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` ${c.label}: ${c.raw}%`}}}}
  });
  $("componentLegend").innerHTML = [["#7968ec","Semantic AI"],["#43b98a","Skill coverage"],["#f1b45e","ML demo"]].map(([color,label])=>`<span class="legend-item"><i class="legend-dot" style="background:${color}"></i>${label}</span>`).join("");
}
function shortName(name) {
  const base = name.replace(/\.[^.]+$/, "");
  return base.length > 18 ? base.slice(0, 15) + "…" : base;
}
function showDetails(r) {
  const panel = $("detailPanel");
  const matched = r.matched_skills || [];
  const missing = r.missing_skills || [];
  const resumeSkills = r.resume_skills || [];
  panel.innerHTML = `<div class="detail-header"><div><span class="step-label">CANDIDATE DETAIL</span><h3>${escapeHtml(r.filename)}</h3></div><div class="detail-score">${r.score}<small>% match</small></div></div>
    <div class="metric-row"><div class="metric-box"><span>Semantic similarity</span><b>${r.semantic_score}%</b></div><div class="metric-box"><span>Skill coverage</span><b>${r.skill_score}%</b></div><div class="metric-box"><span>ML demo probability</span><b>${r.ml_probability}%</b></div></div>
    <div class="detail-columns"><div class="skill-box"><h4>✓ Matched target skills (${matched.length})</h4><div class="skill-tags">${matched.length ? matched.map(s=>`<span class="skill-tag">${escapeHtml(s)}</span>`).join("") : '<span class="subheading">No target skills matched.</span>'}</div></div><div class="skill-box"><h4>＋ Missing target skills (${missing.length})</h4><div class="skill-tags">${missing.length ? missing.map(s=>`<span class="skill-tag missing">${escapeHtml(s)}</span>`).join("") : '<span class="subheading">No missing target skills identified.</span>'}</div></div></div>
    <div class="skill-box" style="margin-top:12px"><h4>Skills identified in resume (${resumeSkills.length})</h4><div class="skill-tags">${resumeSkills.length ? resumeSkills.map(s=>`<span class="skill-tag neutral">${escapeHtml(s)}</span>`).join("") : '<span class="subheading">No known skills from the built-in list were detected.</span>'}</div></div>
    <p class="preview-text"><b>Extracted text preview:</b> ${escapeHtml(r.preview || "No preview available.")}<br><br><b>Similarity method:</b> ${escapeHtml(r.semantic_method || "N/A")}</p>`;
}
$("exportBtn").addEventListener("click", async () => {
  if (!currentResults.length) return showMessage("Analyze resumes before exporting.");
  try {
    const response = await fetch("/api/export", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({results:currentResults})});
    if (!response.ok) throw new Error("Could not export CSV.");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resume_screening_results.csv";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  } catch (error) { showMessage(error.message); }
});
