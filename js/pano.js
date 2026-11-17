/* Elaichi — a small 360° viewer for the four rendered panoramas.
   One full-screen triangle; the fragment shader turns each screen pixel into a direction and
   reads the equirectangular image. Two images can be drawn at once, which is how a step from one
   standing point to the next fades and zooms. Angles are degrees in the public API:
   yaw 0 faces the counter and grows to the right, pitch grows upward. */
(function () {
  'use strict';
  const RAD = Math.PI / 180;

  const VS = 'attribute vec2 p; varying vec2 v; void main(){ v = p; gl_Position = vec4(p, 0.0, 1.0); }';
  const FS = [
    'precision highp float;',
    'varying vec2 v;',
    'uniform sampler2D uA, uB;',
    'uniform float uMix, uHeadA, uHeadB, uZoomA, uZoomB;',
    'uniform vec2 uTan;',
    'uniform mat3 uRot;',
    'const float PI = 3.14159265;',
    'vec4 look(sampler2D t, float head, float zoom) {',
    '  vec3 d = normalize(uRot * vec3(v.x * uTan.x * zoom, v.y * uTan.y * zoom, 1.0));',
    '  float yaw = atan(d.x, d.z) - head;',
    '  float pitch = asin(clamp(d.y, -1.0, 1.0));',
    '  return texture2D(t, vec2(fract(0.5 + yaw / (2.0 * PI)), 0.5 - pitch / PI));',
    '}',
    'void main() {',
    '  vec4 a = look(uA, uHeadA, uZoomA);',
    '  if (uMix > 0.001) { a = mix(a, look(uB, uHeadB, uZoomB), uMix); }',
    '  gl_FragColor = vec4(a.rgb, 1.0);',
    '}'
  ].join('\n');

  function Pano(canvas) {
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('no webgl');
    this.canvas = canvas; this.gl = gl;
    this.max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.bindAttribLocation(pr, 0, 'p'); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    gl.useProgram(pr);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.u = {};
    ['uA', 'uB', 'uMix', 'uHeadA', 'uHeadB', 'uZoomA', 'uZoomB', 'uTan', 'uRot'].forEach((n) => { this.u[n] = gl.getUniformLocation(pr, n); });
    gl.uniform1i(this.u.uA, 0); gl.uniform1i(this.u.uB, 1);
    this.blank = this.texture(null);
    this.lost = false;
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; if (this.onlost) this.onlost(); });
  }

  // an image → texture; no mipmaps (they would draw a seam where the image wraps round)
  Pano.prototype.texture = function (img) {
    const gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (img) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([20, 30, 26]));
    return t;
  };

  // load an image, scaling it down first if this device cannot hold it whole
  Pano.prototype.load = function (url) {
    return new Promise((ok, fail) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        let src = img;
        if (img.naturalWidth > this.max) {
          const c = document.createElement('canvas');
          c.width = this.max; c.height = this.max / 2;
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          src = c;
        }
        try { ok(this.texture(src)); } catch (e) { fail(e); }
      };
      img.onerror = fail;
      img.src = url;
    });
  };

  Pano.prototype.size = function (w, h, dpr) {
    const c = this.canvas, W = Math.round(w * dpr), H = Math.round(h * dpr);
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    this.gl.viewport(0, 0, W, H);
    this.aspect = w / h;
  };

  // the view: yaw/pitch in degrees, fov = vertical field of view in degrees
  Pano.rotation = function (yaw, pitch) {
    const cy = Math.cos(yaw * RAD), sy = Math.sin(yaw * RAD), cp = Math.cos(pitch * RAD), sp = Math.sin(pitch * RAD);
    // columns: right, up, forward (world = R * view)
    return [cy, 0, -sy, -sy * sp, cp, -cy * sp, sy * cp, sp, cy * cp];
  };

  Pano.prototype.draw = function (s) {
    if (this.lost) return;
    const gl = this.gl, u = this.u, ty = Math.tan(s.fov * RAD / 2);
    gl.uniformMatrix3fv(u.uRot, false, Pano.rotation(s.yaw, s.pitch));
    gl.uniform2f(u.uTan, ty * this.aspect, ty);
    gl.uniform1f(u.uHeadA, (s.headA || 0) * RAD); gl.uniform1f(u.uHeadB, (s.headB || 0) * RAD);
    gl.uniform1f(u.uZoomA, s.zoomA || 1); gl.uniform1f(u.uZoomB, s.zoomB || 1);
    gl.uniform1f(u.uMix, s.mix || 0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, s.a || this.blank);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, s.b || this.blank);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  // where a direction lands on screen (CSS pixels), or null if it is behind or far off-screen
  Pano.project = function (yaw, pitch, view, w, h) {
    const cp = Math.cos(pitch * RAD);
    const d = [cp * Math.sin(yaw * RAD), Math.sin(pitch * RAD), cp * Math.cos(yaw * RAD)];
    const R = Pano.rotation(view.yaw, view.pitch);
    const x = R[0] * d[0] + R[1] * d[1] + R[2] * d[2];
    const y = R[3] * d[0] + R[4] * d[1] + R[5] * d[2];
    const z = R[6] * d[0] + R[7] * d[1] + R[8] * d[2];
    if (z < 0.2) return null;
    const ty = Math.tan(view.fov * RAD / 2), tx = ty * w / h;
    const sx = (x / z / tx + 1) / 2 * w, sy = (1 - y / z / ty) / 2 * h;
    if (sx < -60 || sx > w + 60 || sy < -60 || sy > h + 60) return null;
    return [sx, sy];
  };

  window.ElaichiPano = Pano;
})();
