package com.example.numera.ui.dialogs

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.TextStyle
import androidx.compose.foundation.Canvas
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import android.content.Context
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import com.example.numera.data.network.*
import com.example.numera.SoloGame
import com.example.numera.sound.SoundManager
import com.example.numera.theme.*
import com.example.numera.ui.feature.arena.ArenaScreen
import com.example.numera.ui.feature.dashboard.DashboardScreen
import com.example.numera.ui.feature.settings.SettingsScreen
import com.example.numera.ui.components.MathAvatars
import com.example.numera.ui.components.MathBanners
import com.example.numera.ui.components.ProfileBanner
import com.example.numera.ui.components.MathAvatar
import com.example.numera.ui.components.RankBadge
import com.example.numera.ui.components.AchievementBadge
import com.example.numera.ui.components.NumeraIcon
import com.example.numera.ui.components.NumeraIconType
import com.example.numera.ui.components.rememberDrawableResource
import com.example.numera.ui.components.DuoButton
import com.example.numera.ui.components.DuoCard
import com.example.numera.ui.components.GlassCard
import com.example.numera.ui.components.NeonButton
import com.example.numera.ui.components.NeonText
import com.example.numera.ui.components.ClaimButton
import com.example.numera.ui.components.GlossyProgressBar
import com.example.numera.ui.components.NumeraPremiumLoader
import com.example.numera.ui.components.NumeraSkeletonCard
import com.example.numera.ui.components.MathText
import androidx.compose.foundation.BorderStroke
import com.example.numera.ui.components.CommitmentRelicIcon
import com.example.numera.ui.components.ToastController
import com.example.numera.ui.components.ToastType
import com.example.numera.ui.components.LocalToast
import com.example.numera.ui.components.NumeraToastHost
import com.example.numera.ui.components.rememberToastController
import com.example.numera.ui.components.NumeraEmptyState
import com.example.numera.ui.components.EmptyIllustration
import com.example.numera.ui.components.NumeraSearchField
import com.example.numera.ui.components.rememberDebouncedValue
import com.example.numera.ui.components.rememberInfiniteScroll
import com.example.numera.ui.components.rememberRevealWindow
import com.example.numera.ui.components.LoadMoreFooter
import com.example.numera.ui.components.runOptimistic
import com.example.numera.ui.components.ArchiveRowSkeleton
import com.example.numera.ui.components.LeaderboardRowSkeleton
import com.example.numera.ui.components.NotificationSkeleton
import com.example.numera.ui.components.ShopItemSkeleton
import com.example.numera.ui.components.AchievementSkeleton
import com.example.numera.ui.components.LessonCardSkeleton
import com.example.numera.ui.components.SkeletonList
import com.example.numera.ui.components.SkeletonLine
import com.example.numera.ui.components.CommandPaletteController
import com.example.numera.ui.components.CommandPaletteHost
import com.example.numera.ui.components.CommandItem
import com.example.numera.ui.components.CommandCategory
import com.example.numera.ui.components.LocalCommandPalette
import com.example.numera.ui.components.rememberCommandPaletteController
import com.example.numera.ui.components.NumeraBreadcrumbs
import com.example.numera.ui.components.Crumb
import com.example.numera.ui.components.NumeraFilterRow
import com.example.numera.ui.components.NumeraFilterChip
import com.example.numera.ui.components.NumeraBottomSheet
import com.example.numera.ui.components.SheetActionRow
import com.example.numera.ui.components.SheetSectionLabel
import com.example.numera.ui.components.ContextMenuArea
import com.example.numera.ui.components.ContextAction
import com.example.numera.ui.components.NumeraQuickPreview
import com.example.numera.ui.components.QuickActionsBar
import com.example.numera.ui.components.QuickAction
import com.example.numera.ui.components.DisclosureSection
import io.socket.client.Socket
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.async
import org.json.JSONObject

data class LevelDebriefInfo(
    val title: String,
    val categoryName: String,
    val eloRating: String,
    val description: String,
    val concepts: List<String>
)

fun getLevelDebriefInfo(levelNum: Int): LevelDebriefInfo {
    // Milestones
    if (levelNum == 10) {
        return LevelDebriefInfo(
            title = "The Pythagorean Theorem",
            categoryName = "Arithmetic Milestone",
            eloRating = "Standard (800-1200)",
            description = "Master right-angled triangles using the famous formula relating perpendicular sides and the hypotenuse.",
            concepts = listOf("Right triangles", "Hypotenuse", "Pythagorean Triples")
        )
    }
    if (levelNum == 20) {
        return LevelDebriefInfo(
            title = "Fermat's Little Theorem",
            categoryName = "Algebra Milestone",
            eloRating = "Expert (1200-1500)",
            description = "Apply modular algebra and prime modulus reductions to simplify large exponential congruences.",
            concepts = listOf("Prime modulus", "Congruences", "Modular reduction")
        )
    }
    if (levelNum == 30) {
        return LevelDebriefInfo(
            title = "The Binomial Theorem",
            categoryName = "Combinatorics Milestone",
            eloRating = "Expert (1200-1500)",
            description = "Expand algebraic expressions of the form (x+y)^n and determine coefficients using combination selections.",
            concepts = listOf("Binomial coefficients", "Combinations selection", "Pascal's Triangle")
        )
    }
    if (levelNum == 40) {
        return LevelDebriefInfo(
            title = "Fundamental Theorem of Calculus",
            categoryName = "Calculus Milestone",
            eloRating = "Expert (1200-1500)",
            description = "Evaluate definite Riemann integrals using antiderivatives over bound intervals.",
            concepts = listOf("Antiderivatives", "Definite Integration", "Integration Bounds")
        )
    }
    if (levelNum == 50) {
        return LevelDebriefInfo(
            title = "Euler's Totient Theorem",
            categoryName = "Number Theory Milestone",
            eloRating = "Expert (1200-1500)",
            description = "Utilize Euler's totient function and modular totient theorems to solve complex modular relations.",
            concepts = listOf("Euler's phi function", "Coprimality", "Totient reduction")
        )
    }
    if (levelNum == 60) {
        return LevelDebriefInfo(
            title = "Euler's Identity",
            categoryName = "Grand Milestone",
            eloRating = "Insane (>1500)",
            description = "Confront the most beautiful relation in mathematics, linking e, i, pi, 1, and 0 in complex calculations.",
            concepts = listOf("Complex analysis", "Euler's formula", "Mathematical constants")
        )
    }

    // Interleaved levels
    val category = when (levelNum % 6) {
        0 -> "Number Theory"
        1 -> "Arithmetic"
        2 -> "Mental Math"
        3 -> "Algebra"
        4 -> "Calculus"
        else -> "Combinatorics"
    }

    val elo = when {
        levelNum <= 15 -> "Beginner (<800)"
        levelNum <= 30 -> "Standard (800-1200)"
        levelNum <= 45 -> "Expert (1200-1500)"
        else -> "Insane (>1500)"
    }

    // Specific sub-level index for category
    val index = (levelNum - 1) / 6 + 1

    val (title, description, concepts) = when (category) {
        "Arithmetic" -> {
            when (index) {
                1 -> Triple("Single-Digit Addition", "Master simple arithmetic summing single-digit integers.", listOf("Addition", "Number Line"))
                2 -> Triple("Two-Digit Sums", "Calculate sums of two-digit and single-digit integers without carrying.", listOf("Units column", "Tens column"))
                3 -> Triple("Decomposed Addition", "Evaluate double-digit additions by decomposing into place values.", listOf("Place value", "Decomposition"))
                4 -> Triple("Multi-Operand Sums", "Evaluate expressions combining three addition and subtraction terms.", listOf("Operation Precedence", "Operators"))
                5 -> Triple("Addition with Carry", "Perform two-digit summation requiring carrying over units to tens.", listOf("Carrying rule", "Columns alignment"))
                6 -> Triple("Subtraction under Borrow", "Evaluate differences requiring borrowing from the tens column.", listOf("Borrowing rule", "Minuend/Subtrahend"))
                7 -> Triple("Multiplication Tables", "Compute products of single digits representing repeated additions.", listOf("Scaling", "Product"))
                8 -> Triple("Inverse Division", "Evaluate division using inverse multiplication tables.", listOf("Quotient", "Divisor", "Dividend"))
                else -> Triple("Order of Operations", "Evaluate complex arithmetic expressions following PEMDAS precedence.", listOf("Precedence", "Multiplication first"))
            }
        }
        "Mental Math" -> {
            when (index) {
                1 -> Triple("Mental Multiples", "Calculate additions and subtractions of multiples of 10 and 5 mentally.", listOf("Visualization", "Multiples of 10"))
                2 -> Triple("Basic Percentages", "Quickly evaluate common percentages like 10%, 25%, 50%, and 75% of integers.", listOf("Ratios", "Fractions"))
                3 -> Triple("Tricky Percentages", "Calculate percentages like 15%, 35%, 60% of numbers mentally.", listOf("Mental decomposition", "Parts scaling"))
                4 -> Triple("Shortcuts Multiplication", "Apply mental multiplication shortcuts for multiplying by 5, 9, or 11.", listOf("Distributive trick", "Halving"))
                5 -> Triple("Mental Squaring", "Mentally compute squares of integers between 11 and 20.", listOf("Self-multiplication", "Base scaling"))
                6 -> Triple("Mental Cubing", "Compute cubes of single-digit integers mentally.", listOf("Cubes", "Power of 3"))
                7 -> Triple("Nearest Integer Estimation", "Estimate float products to the nearest integer.", listOf("Rounding", "Float scaling"))
                8 -> Triple("Arithmetic Mean", "Calculate average values of small lists of integers.", listOf("Summation", "Dividing count"))
                9 -> Triple("Sample Space Roll", "Determine count of dice combinations summing to target values.", listOf("Dice outcomes", "Probability space"))
                else -> Triple("Compound Percentage", "Compute consecutive percentages of base integers mentally.", listOf("Compound ratio", "Sequential multiplication"))
            }
        }
        "Algebra" -> {
            when (index) {
                1 -> Triple("One-Step Equations (+/-)", "Isolate unknown variable x by adding or subtracting constants.", listOf("Variable", "Inverse addition"))
                2 -> Triple("One-Step Equations (*/)", "Solve equations requiring division to isolate variables.", listOf("Coefficient", "Inverse multiplication"))
                3 -> Triple("Two-Step Equations", "Solve equations of form ax + b = c by combining multiple isolation steps.", listOf("Constant subtraction", "Division"))
                4 -> Triple("Variables on Both Sides", "Isolate variables by moving all x terms to one side.", listOf("Simplification", "Balancing"))
                5 -> Triple("Quadratic Roots", "Determine larger integer roots of factored quadratic equations.", listOf("Roots", "Factoring"))
                6 -> Triple("Linear Systems", "Solve systems of two simultaneous linear equations.", listOf("Substitution", "Elimination"))
                7 -> Triple("Matrix Trace", "Calculate the sum of the main diagonal elements of 2x2 matrices.", listOf("Square Matrix", "Diagonal sum"))
                8 -> Triple("Matrix Determinants", "Evaluate det(A) of 2x2 matrices with positive integers.", listOf("Cross multiplication", "Determinant"))
                else -> Triple("Signed Matrix Determinants", "Compute det(A) of 2x2 matrices with negative integer elements.", listOf("Negative signs", "Precedence"))
            }
        }
        "Calculus" -> {
            when (index) {
                1 -> Triple("Power Rule Derivative", "Evaluate derivatives of power functions ax^b at x=1.", listOf("Derivatives", "Power rule"))
                2 -> Triple("Polynomial Differentiation", "Evaluate derivative of polynomial functions at x=1.", listOf("Sum rule", "Term-by-term"))
                3 -> Triple("Tangent Line Slope", "Find derivative value at non-trivial evaluation points.", listOf("Slope", "Tangent"))
                4 -> Triple("Trig Differentiation", "Find derivative of functions combining trig and linear terms at x=0.", listOf("Cosine derivative", "Trig evaluation"))
                5 -> Triple("Constant Integrals", "Evaluate definite integrals of constant functions over positive intervals.", listOf("Antiderivative", "Interval area"))
                6 -> Triple("Linear Definite Integrals", "Integrate linear functions using the reverse power rule.", listOf("Reverse power rule", "Integration limits"))
                7 -> Triple("Average Value of Function", "Calculate mean height of quadratic functions over intervals.", listOf("Average formula", "Definite integral"))
                8 -> Triple("Linear Sequence Limits", "Determine sequence limits as n approaches infinity for linear functions.", listOf("Asymptotes", "Limits at infinity"))
                else -> Triple("Quadratic Sequence Limits", "Determine sequence limits as n approaches infinity for quadratic functions.", listOf("Dominant term", "Rational limits"))
            }
        }
        "Combinatorics" -> {
            when (index) {
                1 -> Triple("Pigeonhole Principle I", "Determine minimum draws to guarantee a color repeat.", listOf("Dirichlet principle", "Worst-case"))
                2 -> Triple("Pigeonhole Principle II", "Apply pigeonhole rules to complex color distributions.", listOf("Pigeonholes", "Matching pair"))
                3 -> Triple("Linear Permutations", "Compute distinct ways to arrange unique items in a row.", listOf("Factorial", "Arrangements"))
                4 -> Triple("Multiset Permutations", "Determine distinct letter arrangements for words with repeat characters.", listOf("Repeating letters", "Permutations"))
                5 -> Triple("Binomial Coefficients", "Evaluate combinations representing ways to choose subsets.", listOf("Combinations", "Subset selection"))
                6 -> Triple("Combinatorial Handshakes", "Compute total handshakes or games played in tournament formats.", listOf("Subsets of size 2", "Binomial coefficient"))
                7 -> Triple("Coin Flip Sample Space", "Calculate total outcomes for sequential independent events.", listOf("Independent events", "Powers of 2"))
                8 -> Triple("Circular Permutations", "Evaluate distinct circular seating arrangements of people.", listOf("Circular fixing", "N-1 factorial"))
                else -> Triple("Stars and Bars", "Compute number of ways to distribute tokens into distinct boxes.", listOf("Identical tokens", "Stars and bars"))
            }
        }
        else -> { // Number Theory
            when (index) {
                1 -> Triple("Basic GCD", "Determine greatest common divisor using factors.", listOf("Common divisor", "Euclidean reduction"))
                2 -> Triple("Advanced GCD", "Find GCD of larger integers using Euclidean remainder divisions.", listOf("Euclidean algorithm", "Remainders"))
                3 -> Triple("Modular Addition", "Evaluate modular sums over positive integer moduli.", listOf("Modulus", "Remainder"))
                4 -> Triple("Modular Multiplication", "Evaluate modular product of integer bases.", listOf("Congruence", "Modular scale"))
                5 -> Triple("Modular Exponentiation I", "Compute small modular powers by consecutive multiplication.", listOf("Powers", "Modular cycle"))
                6 -> Triple("Modular Exponentiation II", "Evaluate modular powers using successive squaring.", listOf("Successive squaring", "Modulo reduction"))
                7 -> Triple("Positive Divisors", "Determine total count of positive divisors from prime factorizations.", listOf("Prime factors", "Divisor count"))
                8 -> Triple("Euler Totient Prime", "Find phi(p) for prime integers p.", listOf("Totient function", "Coprimes"))
                else -> Triple("Euler Totient Composite", "Calculate phi(n) for composite products of two primes.", listOf("Multiplicative property", "Euler phi"))
            }
        }
    }

    return LevelDebriefInfo(title, category, elo, description, concepts)
}

@Composable
fun LevelDebriefDialog(
    levelNum: Int,
    category: String,
    onDismissRequest: () -> Unit,
    onStartLesson: () -> Unit
) {
    val debrief = remember(levelNum) { getLevelDebriefInfo(levelNum) }

    LaunchedEffect(levelNum) {
        SoundManager.playRewardClaim()
    }

    val (startColor, endColor, _) = when {
        category == "mental" -> Triple(Color(0xFF818CF8), Color(0xFF4F46E5), Color(0xFF3730A3))
        category == "arithmetic" -> Triple(Color(0xFF34D399), Color(0xFF059669), Color(0xFF065F46))
        category == "algebra" -> Triple(Color(0xFFFBBF24), Color(0xFFD97706), Color(0xFF92400E))
        category == "number_theory" -> Triple(Color(0xFF2DD4BF), Color(0xFF0D9488), Color(0xFF115E59))
        category == "calculus" -> Triple(Color(0xFF3B82F6), Color(0xFF2563EB), Color(0xFF1E3A8A))
        category == "combinatorics" -> Triple(Color(0xFFEC4899), Color(0xFFDB2777), Color(0xFF881337))
        else -> Triple(Color(0xFFFBBF24), Color(0xFFD97706), Color(0xFF92400E))
    }

    androidx.compose.ui.window.Dialog(onDismissRequest = onDismissRequest) {
        DuoCard(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            borderColor = startColor
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Header with Subject Tag & Close button
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .background(startColor.copy(alpha = 0.15f), RoundedCornerShape(8.dp))
                            .border(1.dp, startColor, RoundedCornerShape(8.dp))
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = debrief.categoryName.uppercase(),
                            color = startColor,
                            fontWeight = FontWeight.Black,
                            fontSize = 10.sp,
                            letterSpacing = 0.5.sp
                        )
                    }

                    IconButton(
                        onClick = {
                            SoundManager.playClick()
                            com.example.numera.haptic.HapticManager.playSoft()
                            onDismissRequest()
                        },
                        modifier = Modifier.size(24.dp)
                    ) {
                        com.example.numera.ui.components.NumeraIcon(
                            type = com.example.numera.ui.components.NumeraIconType.Close,
                            tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Title
                Text(
                    text = debrief.title,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Black,
                    color = MaterialTheme.colorScheme.onSurface,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(4.dp))

                // Level indicator
                Text(
                    text = "LEVEL $levelNum",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.secondary,
                    letterSpacing = 1.sp
                )

                Spacer(modifier = Modifier.height(16.dp))

                // ELO Difficulty Badge
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier
                        .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(12.dp))
                        .padding(horizontal = 14.dp, vertical = 10.dp)
                ) {
                    com.example.numera.ui.components.NumeraIcon(
                        type = com.example.numera.ui.components.NumeraIconType.Arena,
                        tint = startColor,
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        text = "Target ELO: ${debrief.eloRating}",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Description
                Text(
                    text = debrief.description,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f),
                    textAlign = TextAlign.Center,
                    lineHeight = 20.sp
                )

                Spacer(modifier = Modifier.height(20.dp))

                // Concepts Header
                Text(
                    text = "LEARNING FOCUS",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Black,
                    color = MaterialTheme.colorScheme.secondary,
                    letterSpacing = 0.5.sp
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Concepts List
                Row(
                    modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    debrief.concepts.forEach { concept ->
                        Box(
                            modifier = Modifier
                                .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(8.dp))
                                .padding(horizontal = 10.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = concept,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(28.dp))

                // Start button
                DuoButton(
                    text = "Start Lesson (+20 XP)",
                    onClick = {
                        onStartLesson()
                        onDismissRequest()
                    },
                    color = CorrectGreen,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
    }
}
