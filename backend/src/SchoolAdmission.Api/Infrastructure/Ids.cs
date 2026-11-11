using System.Security.Cryptography;

namespace SchoolAdmission.Api.Infrastructure;

public static class Ids
{
    /// <summary>A readable prefix plus random hex, e.g. h_9c41e07ab25d3f18. Random, so ids cannot be guessed.</summary>
    public static string New(string prefix) =>
        $"{prefix}_{Convert.ToHexString(RandomNumberGenerator.GetBytes(8)).ToLowerInvariant()}";
}
