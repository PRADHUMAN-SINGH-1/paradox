const styleId = 'paradox-ai-input-layout-fix';
if (!document.getElementById(styleId)) {
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .generator-page.ai-page .generator-fields,
    .generator-page.utility-page .generator-fields { display:grid !important; grid-template-columns:minmax(0,1fr) !important; gap:18px !important; width:100% !important; }
    .generator-page.ai-page .generator-fields .field,
    .generator-page.utility-page .generator-fields .field { display:grid !important; grid-template-columns:minmax(0,1fr) !important; gap:8px !important; width:100% !important; min-width:0 !important; margin:0 !important; }
    .generator-page.ai-page .generator-fields .field label,
    .generator-page.utility-page .generator-fields .field label { display:block !important; width:100% !important; margin:0 !important; color:#28302b !important; font:700 12px/1.2 'DM Mono',monospace !important; letter-spacing:.11em !important; text-transform:uppercase !important; }
    .generator-page.ai-page .generator-fields .field input,
    .generator-page.ai-page .generator-fields .field textarea,
    .generator-page.utility-page .generator-fields .field input,
    .generator-page.utility-page .generator-fields .field textarea { display:block !important; width:100% !important; max-width:none !important; min-width:0 !important; box-sizing:border-box !important; margin:0 !important; color:#f7faf7 !important; background:#0b100e !important; border:1px solid #3d4741 !important; border-radius:10px !important; padding:14px 16px !important; font:16px/1.55 'DM Sans',sans-serif !important; }
    .generator-page.ai-page .generator-fields .field textarea,
    .generator-page.utility-page .generator-fields .field textarea { min-height:170px !important; resize:vertical !important; }
    .generator-page.ai-page .generator-fields .field input::placeholder,
    .generator-page.ai-page .generator-fields .field textarea::placeholder,
    .generator-page.utility-page .generator-fields .field input::placeholder,
    .generator-page.utility-page .generator-fields .field textarea::placeholder { color:#9da7a0 !important; opacity:1 !important; }
    .generator-page.ai-page .generator-fields .field input:focus,
    .generator-page.ai-page .generator-fields .field textarea:focus,
    .generator-page.utility-page .generator-fields .field input:focus,
    .generator-page.utility-page .generator-fields .field textarea:focus { background:#080d0b !important; border-color:#d9ff3f !important; outline:2px solid rgba(217,255,63,.26) !important; outline-offset:1px !important; }
    .studio #fields { display:grid !important; grid-template-columns:minmax(0,1fr) !important; gap:18px !important; width:100% !important; }
    .studio #fields > label { display:grid !important; grid-template-columns:minmax(0,1fr) !important; gap:8px !important; width:100% !important; min-width:0 !important; margin:0 !important; color:#242a26 !important; font:700 12px/1.25 'DM Mono',monospace !important; letter-spacing:.08em !important; text-transform:uppercase !important; }
    .studio #fields input,
    .studio #fields textarea { display:block !important; width:100% !important; max-width:none !important; min-width:0 !important; box-sizing:border-box !important; margin:0 !important; color:#f7faf7 !important; background:#0b100e !important; border:1px solid #3d4741 !important; border-radius:10px !important; padding:14px 16px !important; font:16px/1.55 'DM Sans',sans-serif !important; }
    .studio #fields textarea { min-height:170px !important; resize:vertical !important; }
    .studio #fields input::placeholder,.studio #fields textarea::placeholder { color:#9da7a0 !important; opacity:1 !important; }
    .studio #fields input:focus,.studio #fields textarea:focus { background:#080d0b !important; border-color:#d9ff3f !important; outline:2px solid rgba(217,255,63,.26) !important; outline-offset:1px !important; }
    .studio .flow,.studio .flow span,.studio .flow small,.studio .flow strong,.studio .side-head,.studio .form-head>div>span,.studio .status,.studio #example,.studio .btn,.studio .run { opacity:1 !important; }
    .studio .flow { color:#5b625d !important; }
    .studio .flow span { color:#3d4540 !important; font-weight:700 !important; }
    .studio .flow small { color:#68706a !important; }
    .studio .flow strong { color:#8b948e !important; }
    .studio .flow:hover,.studio .flow.active { background:#fffdf7 !important; }
    .studio .flow:hover span,.studio .flow.active span,.studio .flow:hover strong,.studio .flow.active strong { color:#e84e38 !important; }
    .studio .side-head,.studio .form-head>div>span,.studio .status { color:#3d4540 !important; }
    .studio .status { background:#f4f0e7 !important; border-color:#c5c1b6 !important; }
    .studio #example { color:#171b18 !important; border-color:#313833 !important; background:#fffdf7 !important; }
    .studio .btn { color:#171b18 !important; background:#f7f3ea !important; border-color:#aaa79d !important; }
    .studio .run { color:#fff !important; background:#0c0e0e !important; }
  `;
  document.head.appendChild(style);
}


export {};
