export function createQuadBuffer(gl: WebGLRenderingContext): WebGLBuffer {
	const quadVertices = new Float32Array([
		-1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1, 1, 1, 1, 1,
	]);

	const buffer = gl.createBuffer();
	if (!buffer) throw new Error("Failed to create quad buffer");

	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

	return buffer;
}

export function createBrushBuffer(gl: WebGLRenderingContext): WebGLBuffer {
	const buffer = gl.createBuffer();
	if (!buffer) throw new Error("Failed to create brush buffer");
	return buffer;
}

export function createFramebuffers(gl: WebGLRenderingContext): {
	framebufferA: WebGLFramebuffer;
	framebufferB: WebGLFramebuffer;
} {
	const framebufferA = gl.createFramebuffer();
	const framebufferB = gl.createFramebuffer();

	if (!framebufferA || !framebufferB) {
		throw new Error("Failed to create framebuffers");
	}

	return { framebufferA, framebufferB };
}

export function getFramebufferStatusString(
	gl: WebGLRenderingContext,
	status: number,
): string {
	switch (status) {
		case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
			return "FRAMEBUFFER_INCOMPLETE_ATTACHMENT";
		case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
			return "FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT";
		case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
			return "FRAMEBUFFER_INCOMPLETE_DIMENSIONS";
		case gl.FRAMEBUFFER_UNSUPPORTED:
			return "FRAMEBUFFER_UNSUPPORTED";
		default:
			return `Unknown status: ${status}`;
	}
}
