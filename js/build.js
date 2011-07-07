// parameters: config and moduleInfo 
// Builder, Resolver, Loader, fetcher, writer are defined in the calling code
function build (config, moduleInfo) {

	var builder = new Builder();
	builder.Resolver = Resolver;
	builder.loader = new Loader();
	builder.fetcher = fetcher.fetch;
	builder.writer = writer.getWriter();
	builder.build(moduleInfo, config);
	print(writer.getOutput());

}
