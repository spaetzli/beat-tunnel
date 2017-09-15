function DoubleBuffer(width, height)
{
	this.frontBuffer;
	this.backBuffer;
	this.frontCtx;
	this.backCtx;
	this.width = width;
	this.height = height;
	
	this.init = function()
	{
		// Create Buffers
		this.frontBuffer = document.createElement('canvas');
		this.backBuffer = document.createElement('canvas');
		// Init Buffer Dimensions
		this.frontBuffer.width = this.backBuffer.width = width;
		this.frontBuffer.height = this.backBuffer.height = height;
		// Get Contexts for Drawing to Buffers
		this.frontCtx = this.frontBuffer.getContext('2d');
		this.backCtx = this.backBuffer.getContext('2d');
	}
	
	this.swapBuffers = function()
	{
		// Store the front buffer/context in temporary values
		var tempBuffer = this.frontBuffer;
		var tempCtx = this.frontCtx;
		// Swap the back buffers to the front
		this.frontBuffer = this.backBuffer;
		this.frontCtx = this.backCtx;
		// Swap the front buffers stored in the temp variables to the back
		this.backBuffer = tempBuffer;
		this.backCtx = tempCtx;
	}
	
	this.clearBuffer = function(buffer)
	{
		//(buffer === 'front' ? this.frontCtx : this.backCtx).clearRect(0,0,width,height);
		if(buffer === 'front')
			this.frontCtx.clearRect(0,0,width,height);
		else if(buffer === 'back')
			this.backCtx.clearRect(0,0,width,height);
	}
	
	this.init();
}