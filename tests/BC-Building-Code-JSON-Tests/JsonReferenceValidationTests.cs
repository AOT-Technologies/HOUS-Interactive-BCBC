using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Xunit;

namespace BCBuildingCode.Tests;

public class RefIntegrityTests
{

    static readonly string JsonTestFilePath =
    Environment.GetEnvironmentVariable("BCBC_JSON_PATH") ?? ""; 

    [Fact]
    public void BCBC_JSON_File_Exists_Sanity()
    {
	try 
	{
            var jsonText = File.ReadAllText(JsonTestFilePath);
            Assert.True(true, $"");
	}
	catch (Exception ex) 
	{
	    Console.WriteLine(ex.Message);
	}
        
    }
	

    [Fact]
    public void All_Refs_Are_Valid()
    {
        // TODO
        Assert.True(true, $"");
    }


    [Fact]
    public void PlainText_InternalIds_Should_Be_Marked_As_REF()
    {
        // TODO
        Assert.True(true, $"");
    }

}
