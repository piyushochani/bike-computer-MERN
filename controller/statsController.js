const Ride = require('../models/Ride');
const User = require('../models/User');

// Get user statistics
exports.getUserStats = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.userId;

    const rides = await Ride.find({ userId });

    if (rides.length === 0) {
      return res.json({
        success: true,
        stats: {
          longestRide: { distance: 0, time: 0, elevationGained: 0 },
          bestEfforts: {},
          totalDistance: 0,
          yearDistance: 0,
          totalCoins: 0
        }
      });
    }

    // Calculate longest ride by distance, time, and elevation
    const longestByDistance = rides.reduce((max, ride) => 
      ride.distance > max.distance ? ride : max
    );
    const longestByTime = rides.reduce((max, ride) => 
      ride.totalTime > max.totalTime ? ride : max
    );
    const longestByElevation = rides.reduce((max, ride) => 
      ride.elevationGained > max.elevationGained ? ride : max
    );

    // Calculate best efforts for specific distances
    const bestEfforts = {};
    const targetDistances = [10, 20, 25, 50, 75, 100];

    for (const targetDist of targetDistances) {
      const eligibleRides = rides.filter(ride => ride.distance >= targetDist);
      
      if (eligibleRides.length > 0) {
        // Find fastest time for this distance
        const fastest = eligibleRides.reduce((best, ride) => {
          const timePerKm = ride.totalTime / ride.distance;
          const bestTimePerKm = best.totalTime / best.distance;
          return timePerKm < bestTimePerKm ? ride : best;
        });

        const estimatedTime = (fastest.totalTime / fastest.distance) * targetDist;
        const estimatedSpeed = targetDist / (estimatedTime / 3600);

        bestEfforts[`${targetDist}km`] = {
          time: Math.round(estimatedTime),
          speed: parseFloat(estimatedSpeed.toFixed(2)),
          date: fastest.createdAt,
          rideId: fastest._id
        };
      }
    }

    // Calculate total distance
    const totalDistance = rides.reduce((sum, ride) => sum + ride.distance, 0);

    // Calculate distance this year
    const currentYear = new Date().getFullYear();
    const yearDistance = rides
      .filter(ride => new Date(ride.createdAt).getFullYear() === currentYear)
      .reduce((sum, ride) => sum + ride.distance, 0);

    // Get user's total coins
    const user = await User.findById(userId).select('totalCoins');

    res.json({
      success: true,
      stats: {
        longestRide: {
          distance: {
            value: longestByDistance.distance,
            rideName: longestByDistance.rideName,
            date: longestByDistance.createdAt,
            rideId: longestByDistance._id
          },
          time: {
            value: longestByTime.totalTime,
            rideName: longestByTime.rideName,
            date: longestByTime.createdAt,
            rideId: longestByTime._id
          },
          elevationGained: {
            value: longestByElevation.elevationGained,
            rideName: longestByElevation.rideName,
            date: longestByElevation.createdAt,
            rideId: longestByElevation._id
          }
        },
        bestEfforts,
        totalDistance: parseFloat(totalDistance.toFixed(2)),
        yearDistance: parseFloat(yearDistance.toFixed(2)),
        totalCoins: user.totalCoins,
        totalRides: rides.length
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching user statistics' 
    });
  }
};

// Get weekly distance data for graph
exports.getWeeklyStats = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.userId;
    const { weeks = 12 } = req.query; // Default to last 12 weeks

    const weeksAgo = new Date();
    weeksAgo.setDate(weeksAgo.getDate() - (weeks * 7));

    const rides = await Ride.find({
      userId,
      createdAt: { $gte: weeksAgo }
    }).sort({ createdAt: 1 });

    // Group rides by week
    const weeklyData = {};
    
    rides.forEach(ride => {
      const rideDate = new Date(ride.createdAt);
      const weekStart = new Date(rideDate);
      weekStart.setDate(rideDate.getDate() - rideDate.getDay()); // Start of week (Sunday)
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          week: weekKey,
          distance: 0,
          rides: 0,
          time: 0,
          coins: 0
        };
      }

      weeklyData[weekKey].distance += ride.distance;
      weeklyData[weekKey].rides += 1;
      weeklyData[weekKey].time += ride.totalTime;
      weeklyData[weekKey].coins += ride.coinsEarned;
    });

    // Convert to array and sort by date
    const weeklyArray = Object.values(weeklyData).map(week => ({
      ...week,
      distance: parseFloat(week.distance.toFixed(2)),
      averageSpeed: parseFloat((week.distance / (week.time / 3600)).toFixed(2))
    }));

    res.json({
      success: true,
      weeklyStats: weeklyArray
    });
  } catch (error) {
    console.error('Get weekly stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching weekly statistics' 
    });
  }
};

// Get monthly statistics
exports.getMonthlyStats = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.userId;
    const { months = 6 } = req.query; // Default to last 6 months

    const monthsAgo = new Date();
    monthsAgo.setMonth(monthsAgo.getMonth() - months);

    const rides = await Ride.find({
      userId,
      createdAt: { $gte: monthsAgo }
    }).sort({ createdAt: 1 });

    // Group rides by month
    const monthlyData = {};
    
    rides.forEach(ride => {
      const rideDate = new Date(ride.createdAt);
      const monthKey = `${rideDate.getFullYear()}-${String(rideDate.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          distance: 0,
          rides: 0,
          time: 0,
          coins: 0,
          elevationGained: 0
        };
      }

      monthlyData[monthKey].distance += ride.distance;
      monthlyData[monthKey].rides += 1;
      monthlyData[monthKey].time += ride.totalTime;
      monthlyData[monthKey].coins += ride.coinsEarned;
      monthlyData[monthKey].elevationGained += ride.elevationGained;
    });

    // Convert to array
    const monthlyArray = Object.values(monthlyData).map(month => ({
      ...month,
      distance: parseFloat(month.distance.toFixed(2)),
      averageSpeed: parseFloat((month.distance / (month.time / 3600)).toFixed(2)),
      elevationGained: parseFloat(month.elevationGained.toFixed(2))
    }));

    res.json({
      success: true,
      monthlyStats: monthlyArray
    });
  } catch (error) {
    console.error('Get monthly stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching monthly statistics' 
    });
  }
};

// Get personal records
exports.getPersonalRecords = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.userId;

    const rides = await Ride.find({ userId });

    if (rides.length === 0) {
      return res.json({
        success: true,
        records: {}
      });
    }

    // Calculate various records
    const records = {
      fastestSpeed: rides.reduce((max, ride) => 
        ride.maxSpeed > max.maxSpeed ? ride : max
      ),
      highestAverageSpeed: rides.reduce((max, ride) => 
        ride.averageSpeed > max.averageSpeed ? ride : max
      ),
      mostElevation: rides.reduce((max, ride) => 
        ride.elevationGained > max.elevationGained ? ride : max
      ),
      longestDistance: rides.reduce((max, ride) => 
        ride.distance > max.distance ? ride : max
      ),
      longestTime: rides.reduce((max, ride) => 
        ride.totalTime > max.totalTime ? ride : max
      ),
      mostCoins: rides.reduce((max, ride) => 
        ride.coinsEarned > max.coinsEarned ? ride : max
      )
    };

    res.json({
      success: true,
      records: {
        fastestSpeed: {
          value: records.fastestSpeed.maxSpeed,
          rideName: records.fastestSpeed.rideName,
          date: records.fastestSpeed.createdAt,
          rideId: records.fastestSpeed._id
        },
        highestAverageSpeed: {
          value: records.highestAverageSpeed.averageSpeed,
          rideName: records.highestAverageSpeed.rideName,
          date: records.highestAverageSpeed.createdAt,
          rideId: records.highestAverageSpeed._id
        },
        mostElevation: {
          value: records.mostElevation.elevationGained,
          rideName: records.mostElevation.rideName,
          date: records.mostElevation.createdAt,
          rideId: records.mostElevation._id
        },
        longestDistance: {
          value: records.longestDistance.distance,
          rideName: records.longestDistance.rideName,
          date: records.longestDistance.createdAt,
          rideId: records.longestDistance._id
        },
        longestTime: {
          value: records.longestTime.totalTime,
          rideName: records.longestTime.rideName,
          date: records.longestTime.createdAt,
          rideId: records.longestTime._id
        },
        mostCoins: {
          value: records.mostCoins.coinsEarned,
          rideName: records.mostCoins.rideName,
          date: records.mostCoins.createdAt,
          rideId: records.mostCoins._id
        }
      }
    });
  } catch (error) {
    console.error('Get personal records error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching personal records' 
    });
  }
};

// Compare two rides
exports.compareRides = async (req, res) => {
  try {
    const { rideId1, rideId2 } = req.query;

    if (!rideId1 || !rideId2) {
      return res.status(400).json({ 
        success: false, 
        message: 'Two ride IDs are required for comparison' 
      });
    }

    const ride1 = await Ride.findById(rideId1);
    const ride2 = await Ride.findById(rideId2);

    if (!ride1 || !ride2) {
      return res.status(404).json({ 
        success: false, 
        message: 'One or both rides not found' 
      });
    }

    const comparison = {
      ride1: {
        id: ride1._id,
        name: ride1.rideName,
        distance: ride1.distance,
        time: ride1.totalTime,
        averageSpeed: ride1.averageSpeed,
        maxSpeed: ride1.maxSpeed,
        elevationGained: ride1.elevationGained,
        coins: ride1.coinsEarned,
        date: ride1.createdAt
      },
      ride2: {
        id: ride2._id,
        name: ride2.rideName,
        distance: ride2.distance,
        time: ride2.totalTime,
        averageSpeed: ride2.averageSpeed,
        maxSpeed: ride2.maxSpeed,
        elevationGained: ride2.elevationGained,
        coins: ride2.coinsEarned,
        date: ride2.createdAt
      },
      differences: {
        distance: parseFloat((ride1.distance - ride2.distance).toFixed(2)),
        time: ride1.totalTime - ride2.totalTime,
        averageSpeed: parseFloat((ride1.averageSpeed - ride2.averageSpeed).toFixed(2)),
        maxSpeed: parseFloat((ride1.maxSpeed - ride2.maxSpeed).toFixed(2)),
        elevationGained: parseFloat((ride1.elevationGained - ride2.elevationGained).toFixed(2)),
        coins: ride1.coinsEarned - ride2.coinsEarned
      }
    };

    res.json({
      success: true,
      comparison
    });
  } catch (error) {
    console.error('Compare rides error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error comparing rides' 
    });
  }
};